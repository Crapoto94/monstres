import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ImageService } from '../images/image.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateItemDto } from './dto/create-item.dto';

type ItemWithRelations = NonNullable<Awaited<ReturnType<ItemsService['findRaw']>>>;

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

  private findRaw(id: string) {
    return this.prisma.item.findUnique({ where: { id }, include: this.includeRelations() });
  }

  private includeRelations() {
    return {
      photos: { orderBy: { order: 'asc' as const } },
      category: true,
      user: { select: { id: true, name: true, avatar: true } },
    };
  }

  /** §9 : position approximative pour les visiteurs non connectés, exacte pour les connectés. */
  private serialize(item: ItemWithRelations, viewer: AuthenticatedUser | null) {
    const isAuthenticated = viewer !== null;
    const imgBaseUrl = this.config.get<string>('IMG_BASE_URL', 'http://localhost:3000/uploads');

    return {
      ...item,
      latitude: isAuthenticated ? item.latitude : roundApprox(item.latitude),
      longitude: isAuthenticated ? item.longitude : roundApprox(item.longitude),
      address: isAuthenticated ? item.address : null,
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
