import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ImageService } from '../images/image.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ScoringService, ScoringEventType } from '../scoring/scoring.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { haversineKm } from '../common/geo.util';
import { resolveAvatarUrl } from '../common/avatar.util';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { ReservationStatus, VoteType, NotificationType, UserRole } from '../generated/prisma/enums';
import { CreateItemDto } from './dto/create-item.dto';
import { FindItemsQueryDto } from './dto/find-items-query.dto';

type ItemWithRelations = NonNullable<
  Awaited<ReturnType<ItemsService['findRaw']>>
>;

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly imageService: ImageService,
    private readonly config: ConfigService,
    private readonly scoring: ScoringService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async create(
    userId: string,
    dto: CreateItemDto,
    files: Express.Multer.File[] | undefined,
  ) {
    // §9 (redéfini) : un compte non vérifié ne peut pas publier — décision
    // utilisateur, limite les faux comptes/spam avant même la modération.
    const creator = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (!creator?.emailVerifiedAt) {
      throw new BadRequestException('Vérifie ton adresse email avant de publier un Monstre.');
    }

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

    const pointsCreation = await this.settings.getNumber('points_creation', 5);
    await this.scoring.award(userId, item.id, ScoringEventType.USER_CREATED_ITEM, pointsCreation);

    // §6.10/§6.11 : notifie les abonnés dont une zone surveillée couvre ce nouveau Monstre.
    await this.subscriptions.notifyNearbySubscribers({
      ...item,
      photoUrl: this.photoUrl(item.photos[0]),
    });

    return this.serialize(item, { id: userId } as AuthenticatedUser, true);
  }

  async findById(id: string, viewer: AuthenticatedUser | null) {
    const item = await this.findRaw(id);
    if (!item) throw new NotFoundException('Monstre introuvable.');

    const hasVoted = viewer
      ? (await this.prisma.vote.findUnique({
          where: { itemId_userId_type: { itemId: id, userId: viewer.id, type: VoteType.INTERESTING } },
        })) !== null
      : false;

    const hasReported = viewer
      ? (await this.prisma.report.findUnique({
          where: { itemId_userId: { itemId: id, userId: viewer.id } },
        })) !== null
      : false;

    const verified = await this.isViewerVerified(viewer);
    return this.serialize(item, viewer, verified, null, hasVoted, hasReported);
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

    const isAdmin =
      viewer?.role === UserRole.ADMIN || viewer?.role === UserRole.SUPER_ADMIN;
    const collectedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const items = await this.prisma.item.findMany({
      where: {
        // §6.1 : AVAILABLE et RESERVED sont marqués "Visible" dans le cycle
        // de vie du statut. COLLECTED ajouté sur demande utilisateur (badge
        // "Récupéré" dans la liste, plutôt que de faire disparaître le
        // Monstre du jour au lendemain) mais masqué 24h après récupération
        // pour les non-admins, pour ne pas polluer la liste indéfiniment.
        // PENDING_REVIEW/HIDDEN/ARCHIVED restent exclus (modération /
        // historique, §6.1).
        ...(isAdmin
          ? { status: { in: ['AVAILABLE', 'RESERVED', 'COLLECTED'] } }
          : {
              OR: [
                { status: { in: ['AVAILABLE', 'RESERVED'] } },
                { status: 'COLLECTED', collectedAt: { gte: collectedCutoff } },
              ],
            }),
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

    const verified = await this.isViewerVerified(viewer);
    const now = Date.now();

    let scored = items.map((item) => {
      // La distance est calculée sur les coordonnées telles que le viewer
      // les verra (arrondies pour un visiteur non connecté ou non vérifié,
      // §9), pour rester cohérente avec la position exposée dans la réponse.
      const itemLat = verified
        ? item.latitude
        : roundApprox(item.latitude);
      const itemLng = verified
        ? item.longitude
        : roundApprox(item.longitude);
      const distanceKm = hasPosition
        ? haversineKm(query.lat!, query.lng!, itemLat, itemLng)
        : null;

      const proximityScore = distanceKm !== null ? 1 / (1 + distanceKm) : 0;
      const popularityScore = item.votesScore / (item.votesScore + 5);
      const ageDays = (now - item.createdAt.getTime()) / 86_400_000;
      const recencyScore = 1 / (1 + ageDays);
      const trustScore = item.user.trustScore / 100;

      const score =
        wDistance * proximityScore +
        wPopularity * popularityScore +
        wRecency * recencyScore +
        wTrust * trustScore;

      return { item, distanceKm, score };
    });

    if (hasPosition && query.radius) {
      scored = scored.filter(
        (entry) =>
          entry.distanceKm !== null && entry.distanceKm <= query.radius!,
      );
    }

    scored.sort((a, b) => {
      if (query.sort === 'recent') {
        return b.item.createdAt.getTime() - a.item.createdAt.getTime();
      }
      if (query.sort === 'nearby' && hasPosition) {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (b.score !== a.score) return b.score - a.score;
      if (
        a.distanceKm !== null &&
        b.distanceKm !== null &&
        a.distanceKm !== b.distanceKm
      ) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.item.votesScore !== b.item.votesScore)
        return b.item.votesScore - a.item.votesScore;
      return b.item.createdAt.getTime() - a.item.createdAt.getTime();
    });

    const total = scored.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageEntries = scored.slice((page - 1) * pageSize, page * pageSize);

    const votedItemIds = viewer
      ? new Set(
          (
            await this.prisma.vote.findMany({
              where: {
                userId: viewer.id,
                type: VoteType.INTERESTING,
                itemId: { in: pageEntries.map((entry) => entry.item.id) },
              },
              select: { itemId: true },
            })
          ).map((vote) => vote.itemId),
        )
      : new Set<string>();

    return {
      items: pageEntries.map((entry) =>
        this.serialize(
          entry.item,
          viewer,
          verified,
          entry.distanceKm !== null ? Math.round(entry.distanceKm * 10) / 10 : null,
          votedItemIds.has(entry.item.id),
        ),
      ),
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  /**
   * §6.2 (redéfini) : puisque l'intérêt n'est plus exclusif, seul un membre
   * ayant manifesté son intérêt peut valider la récupération — pas
   * n'importe qui, mais plus "le" réservataire unique non plus.
   */
  /**
   * §10 (profil) : mes Monstres publiés, ceux qui m'intéressent, ceux que
   * j'ai récupérés — demande utilisateur, pour l'onglet "Mes Monstres" du
   * profil.
   */
  async findMine(userId: string) {
    const verified = await this.isViewerVerified({ id: userId } as AuthenticatedUser);
    const viewer = { id: userId } as AuthenticatedUser;

    const [posted, interested, collected] = await Promise.all([
      this.prisma.item.findMany({
        where: { userId },
        include: this.includeRelations(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.item.findMany({
        where: { reservations: { some: { userId, status: ReservationStatus.ACTIVE } } },
        include: this.includeRelations(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.item.findMany({
        where: { reservations: { some: { userId, status: ReservationStatus.COMPLETED } } },
        include: this.includeRelations(),
        orderBy: { collectedAt: 'desc' },
      }),
    ]);

    return {
      // Ses propres Monstres : toujours en précision exacte, inutile de se
      // cacher sa propre position à soi-même.
      posted: posted.map((item) => this.serialize(item, viewer, true)),
      interested: interested.map((item) => this.serialize(item, viewer, verified)),
      collected: collected.map((item) => this.serialize(item, viewer, verified)),
    };
  }

  async collect(
    itemId: string,
    user: AuthenticatedUser,
    file: Express.Multer.File,
  ) {
    this.imageService.validateFormat(file.mimetype);

    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    if (item.status !== 'AVAILABLE') {
      throw new BadRequestException('Ce Monstre a déjà été récupéré.');
    }

    const myInterest = await this.prisma.reservation.findFirst({
      where: { itemId, userId: user.id, status: ReservationStatus.ACTIVE },
    });
    if (!myInterest) {
      throw new BadRequestException(
        "Indique d'abord que tu es intéressé pour pouvoir valider la récupération.",
      );
    }

    const processedPhoto = await this.imageService.process(file.buffer, itemId);

    await this.prisma.$transaction(async (tx) => {
      await tx.itemPhoto.create({
        data: {
          itemId,
          type: 'COLLECTION',
          path: processedPhoto.path,
          thumbnailPath: processedPhoto.thumbnailPath,
          order: 0,
        },
      });
      await tx.reservation.update({
        where: { id: myInterest.id },
        data: { status: ReservationStatus.COMPLETED },
      });
      // Les autres intérêts actifs sur ce Monstre n'ont plus lieu d'être.
      await tx.reservation.updateMany({
        where: { itemId, status: ReservationStatus.ACTIVE, NOT: { id: myInterest.id } },
        data: { status: ReservationStatus.CANCELLED },
      });
      await tx.item.update({
        where: { id: itemId },
        data: {
          status: 'COLLECTED',
          collectedAt: new Date(),
        },
      });
    });

    // §6.8 : la « récupération » récompense qui a fait le déplacement.
    // « Validation » (points_validation) n'est câblée sur aucune action
    // distincte pour l'instant — voir décision dans PROGRESS.md (Phase 6).
    const pointsRecuperation = await this.settings.getNumber('points_recuperation', 10);
    await this.scoring.award(user.id, itemId, ScoringEventType.USER_COLLECTED_ITEM, pointsRecuperation);

    // §6.11 : le propriétaire est notifié que son Monstre a été récupéré.
    const collector = await this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
    await this.notifications.notify(item.userId, NotificationType.ITEM_COLLECTED, {
      itemId: item.id,
      itemTitle: item.title,
      collectorName: collector?.name ?? 'un membre',
    });

    return this.findById(itemId, user);
  }

  private findRaw(id: string) {
    return this.prisma.item.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
  }

  private includeRelations() {
    return {
      photos: { orderBy: { order: 'asc' as const } },
      category: true,
      user: {
        select: { id: true, name: true, avatar: true, trustScore: true },
      },
      // §6.2 (redéfini) : "intéressé" n'est plus exclusif — on récupère tous
      // les intéressés actifs pour calculer le compteur et savoir si le
      // viewer courant en fait partie.
      reservations: {
        where: { status: ReservationStatus.ACTIVE },
        select: { userId: true },
      },
    };
  }

  /** URL de la miniature (ou photo pleine taille à défaut), pour les notifications. */
  private photoUrl(photo: ItemWithRelations['photos'][number] | undefined): string | null {
    if (!photo) return null;
    const imgBaseUrl = this.config.get<string>(
      'IMG_BASE_URL',
      'http://localhost:3000/uploads',
    );
    return `${imgBaseUrl}/${photo.thumbnailPath ?? photo.path}`;
  }

  /** §9 : position approximative pour les visiteurs non connectés, exacte pour les connectés. */
  /**
   * §9 (redéfini) : la localisation précise n'est plus liée à la simple
   * authentification mais à l'email vérifié — un compte non vérifié ne
   * doit pas pouvoir consulter les positions exactes (décision utilisateur).
   */
  private async isViewerVerified(viewer: AuthenticatedUser | null): Promise<boolean> {
    if (!viewer) return false;
    const user = await this.prisma.user.findUnique({ where: { id: viewer.id }, select: { emailVerifiedAt: true } });
    return user?.emailVerifiedAt != null;
  }

  private serialize(
    item: ItemWithRelations,
    viewer: AuthenticatedUser | null,
    verified: boolean,
    distanceKm: number | null = null,
    hasVoted = false,
    hasReported = false,
  ) {
    const imgBaseUrl = this.config.get<string>(
      'IMG_BASE_URL',
      'http://localhost:3000/uploads',
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { trustScore: _, ...userWithoutTrust } = item.user;
    const activeInterests = item.reservations ?? [];

    return {
      ...item,
      latitude: verified ? item.latitude : roundApprox(item.latitude),
      longitude: verified ? item.longitude : roundApprox(item.longitude),
      address: verified ? item.address : null,
      distance: distanceKm,
      hasVoted,
      hasReported,
      interestedCount: activeInterests.length,
      isInterested: viewer !== null && activeInterests.some((r) => r.userId === viewer.id),
      user: { ...userWithoutTrust, avatar: resolveAvatarUrl(userWithoutTrust.avatar, imgBaseUrl) },
      reservations: undefined,
      photos: item.photos.map((photo) => ({
        ...photo,
        path: `${imgBaseUrl}/${photo.path}`,
        thumbnailPath: photo.thumbnailPath
          ? `${imgBaseUrl}/${photo.thumbnailPath}`
          : null,
      })),
    };
  }
}

/** ~1.1 km de précision à l'équateur — "zone approximative" du §9. */
function roundApprox(value: number): number {
  return Math.round(value * 100) / 100;
}
