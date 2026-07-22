import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ImageService } from '../images/image.service';
import { AdminListItemsQueryDto } from './dto/admin-list-items-query.dto';
import { ItemStatus } from '../generated/prisma/enums';

const DEFAULT_PAGE_SIZE = 20;

/**
 * §14 : recherche multi-critères, changement de statut, suppression
 * définitive. Distinct d'`ItemsService` (public) — logique et permissions
 * différentes, pas de scoring/notifications déclenchés ici.
 */
@Injectable()
export class AdminItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly config: ConfigService,
  ) {}

  private photoUrl(path: string): string {
    const imgBaseUrl = this.config.get<string>('IMG_BASE_URL', 'http://localhost:3000/uploads');
    return `${imgBaseUrl}/${path}`;
  }

  private serializePhotos(photos: { path: string; thumbnailPath: string | null }[]) {
    return photos.map((p) => ({
      ...p,
      path: this.photoUrl(p.path),
      thumbnailPath: p.thumbnailPath ? this.photoUrl(p.thumbnailPath) : null,
    }));
  }

  async findMany(query: AdminListItemsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where = {
      ...(query.search ? { title: { contains: query.search } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          category: true,
          photos: { orderBy: { order: 'asc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.item.count({ where }),
    ]);

    const serialized = items.map((item) => ({
      ...item,
      photos: this.serializePhotos(item.photos),
    }));

    return { items: serialized, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        category: true,
        photos: { orderBy: { order: 'asc' } },
        reservations: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true } } } },
        reports: true,
      },
    });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    return { ...item, photos: this.serializePhotos(item.photos) };
  }

  async updateStatus(id: string, status: ItemStatus) {
    await this.findOrThrow(id);
    return this.prisma.item.update({ where: { id }, data: { status } });
  }

  /** Suppression définitive : ligne(s) en base (cascade) + photos sur disque. */
  async remove(id: string) {
    await this.findOrThrow(id);
    await this.prisma.item.delete({ where: { id } });
    await this.imageService.deleteItemPhotos(id);
    return { deleted: true };
  }

  /** Vider complètement la base de Monstres (SUPER_ADMIN uniquement). */
  async removeAll() {
    const items = await this.prisma.item.findMany({ select: { id: true } });
    await this.prisma.item.deleteMany();
    await Promise.all(items.map((item) => this.imageService.deleteItemPhotos(item.id)));
    return { deleted: items.length };
  }

  private async findOrThrow(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    return item;
  }
}
