import { Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

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

    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
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
    return item;
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

  private async findOrThrow(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    return item;
  }
}
