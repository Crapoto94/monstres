import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ImageService } from '../images/image.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateItemDto } from './dto/create-item.dto';
import { FindItemsQueryDto } from './dto/find-items-query.dto';

type ItemWithRelations = NonNullable<Awaited<ReturnType<ItemsService['findRaw']>>>;

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly imageService: ImageService,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, dto: CreateItemDto, files: Express.Multer.File[] | undefined) {
    const maxPhotos = await this.settings.getNumber('max_photos_per_item', 3);

    if (!files || files.length === 0) {
      throw new BadRequestException('Au moins une photo est requise.');
    }
    if (files.length > maxPhotos) {
      throw new BadRequestException(`Maximum ${maxPhotos} photos par Monstre.`);
    }
    files.forEach((file) => this.imageService.validateFormat(file.mimetype));

    const itemId = randomUUID();
    const processedPhotos = await Promise.all(
      files.map((file) => this.imageService.process(file.buffer, itemId)),
    );

    const item = await this.prisma.item.create({
      data: {
        id: itemId,
        userId,
        categoryId: dto.categoryId || null,
        title: dto.title,
        description: dto.description || null,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address || null,
        photos: {
          create: processedPhotos.map((photo, index) => ({
            type: 'LISTING',
            path: photo.path,
            thumbnailPath: photo.thumbnailPath,
            order: index,
          })),
        },
      },
      include: this.includeRelations(),
    });

    return this.serialize(item, { id: userId } as AuthenticatedUser);
  }

  async findById(id: string, viewer: AuthenticatedUser | null) {
    const item = await this.findRaw(id);
    if (!item) throw new NotFoundException('Monstre introuvable.');
    return this.serialize(item, viewer);
  }

  /**
   * Liste des Monstres disponibles (§8). Classement calculé à la volée
   * (décision v1.1 du cahier des charges, §8) : pas de colonne de ranking
   * matérialisée. Score composite = distance + popularité + récence +
   * fiabilité du créateur, pondéré via `settings` (voir scripts/seed.js —
   * poids non chiffrés dans le cahier des charges, décision de session).
   * Priorité par défaut : distance → popularité → date, utilisée comme
   * critère de départage du score composite.
   */
  async findMany(query: FindItemsQueryDto, viewer: AuthenticatedUser | null) {
    const hasPosition = query.lat !== undefined && query.lng !== undefined;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const items = await this.prisma.item.findMany({
      where: {
        status: 'AVAILABLE',
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      include: this.includeRelations(),
    });

    const [wDistance, wPopularity, wRecency, wTrust] = await Promise.all([
      this.settings.getNumber('ranking_weight_distance', 0.5),
      this.settings.getNumber('ranking_weight_popularity', 0.25),
      this.settings.getNumber('ranking_weight_recency', 0.15),
      this.settings.getNumber('ranking_weight_trust', 0.1),
    ]);

    const isAuthenticated = viewer !== null;
    const now = Date.now();

    let scored = items.map((item) => {
      // La distance est calculée sur les coordonnées telles que le viewer
      // les verra (arrondies pour un visiteur non connecté, §9), pour rester
      // cohérente avec la position exposée dans la réponse.
      const itemLat = isAuthenticated ? item.latitude : roundApprox(item.latitude);
      const itemLng = isAuthenticated ? item.longitude : roundApprox(item.longitude);
      const distanceKm = hasPosition ? haversineKm(query.lat!, query.lng!, itemLat, itemLng) : null;

      const proximityScore = distanceKm !== null ? 1 / (1 + distanceKm) : 0;
      const popularityScore = item.votesScore / (item.votesScore + 5);
      const ageDays = (now - item.createdAt.getTime()) / 86_400_000;
      const recencyScore = 1 / (1 + ageDays);
      const trustScore = item.user.trustScore / 100;

      const score =
        wDistance * proximityScore + wPopularity * popularityScore + wRecency * recencyScore + wTrust * trustScore;

      return { item, distanceKm, score };
    });

    if (hasPosition && query.radius) {
      scored = scored.filter((entry) => entry.distanceKm !== null && entry.distanceKm <= query.radius!);
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.item.votesScore !== b.item.votesScore) return b.item.votesScore - a.item.votesScore;
      return b.item.createdAt.getTime() - a.item.createdAt.getTime();
    });

    const total = scored.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageEntries = scored.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: pageEntries.map((entry) =>
        this.serialize(entry.item, viewer, entry.distanceKm !== null ? Math.round(entry.distanceKm * 10) / 10 : null),
      ),
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  private findRaw(id: string) {
    return this.prisma.item.findUnique({ where: { id }, include: this.includeRelations() });
  }

  private includeRelations() {
    return {
      photos: { orderBy: { order: 'asc' as const } },
      category: true,
      user: { select: { id: true, name: true, avatar: true, trustScore: true } },
    };
  }

  /** §9 : position approximative pour les visiteurs non connectés, exacte pour les connectés. */
  private serialize(item: ItemWithRelations, viewer: AuthenticatedUser | null, distanceKm: number | null = null) {
    const isAuthenticated = viewer !== null;
    const imgBaseUrl = this.config.get<string>('IMG_BASE_URL', 'http://localhost:3000/uploads');
    const { trustScore: _trustScore, ...userWithoutTrust } = item.user;

    return {
      ...item,
      latitude: isAuthenticated ? item.latitude : roundApprox(item.latitude),
      longitude: isAuthenticated ? item.longitude : roundApprox(item.longitude),
      address: isAuthenticated ? item.address : null,
      distance: distanceKm,
      user: userWithoutTrust,
      photos: item.photos.map((photo) => ({
        ...photo,
        path: `${imgBaseUrl}/${photo.path}`,
        thumbnailPath: photo.thumbnailPath ? `${imgBaseUrl}/${photo.thumbnailPath}` : null,
      })),
    };
  }
}

/** ~1.1 km de précision à l'équateur — "zone approximative" du §9. */
function roundApprox(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Distance à vol d'oiseau en km (calcul serveur V1 — PostGIS prévu ensuite, §12.5). */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
