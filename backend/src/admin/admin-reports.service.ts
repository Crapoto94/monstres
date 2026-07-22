import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ImageService } from '../images/image.service';
import { ItemStatus, ReportStatus } from '../generated/prisma/enums';
import { resolveAvatarUrl } from '../common/avatar.util';
import type { ReportDecision } from './dto/resolve-report.dto';

const DEFAULT_PAGE_SIZE = 20;

/**
 * §6.5/§14 : file de modération. Affiche tous les Items ayant au moins un
 * signalement PENDING (quel que soit le statut de l'Item).
 */
@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly config: ConfigService,
  ) {}

  async findQueue(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    // Trouver tous les items qui ont au moins un report PENDING
    const itemsWithPending = await this.prisma.report.findMany({
      where: { status: ReportStatus.PENDING },
      select: { itemId: true },
      distinct: ['itemId'],
    });
    const itemIds = itemsWithPending.map((r) => r.itemId);

    if (itemIds.length === 0) {
      return { items: [], page, pageSize, total: 0, totalPages: 1 };
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where: { id: { in: itemIds } },
        include: {
          user: { select: { id: true, name: true, email: true, trustScore: true, avatar: true } },
          category: { select: { id: true, name: true, icon: true } },
          photos: { orderBy: { order: 'asc' as const } },
          reports: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' as const },
          },
          _count: { select: { reports: true, votes: true, comments: true } },
        },
        orderBy: { updatedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.report.groupBy({
        by: ['itemId'],
        where: { status: ReportStatus.PENDING },
      }).then((r) => r.length),
    ]);

    const imgBaseUrl = this.config.get<string>('IMG_BASE_URL', 'http://localhost:3000/uploads');
    const resolved = items.map((item) => ({
      ...item,
      user: { ...item.user, avatar: resolveAvatarUrl(item.user.avatar, imgBaseUrl) },
      reports: item.reports.map((r) => ({
        ...r,
        user: { ...r.user, avatar: resolveAvatarUrl(r.user.avatar, imgBaseUrl) },
      })),
    }));

    return { items: resolved, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async resolve(itemId: string, decision: ReportDecision) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');

    switch (decision) {
      case 'KEEP':
        await this.prisma.$transaction([
          this.prisma.item.update({
            where: { id: itemId },
            data: { status: item.status === ItemStatus.PENDING_REVIEW ? ItemStatus.AVAILABLE : item.status },
          }),
          this.prisma.report.updateMany({
            where: { itemId, status: ReportStatus.PENDING },
            data: { status: ReportStatus.REJECTED },
          }),
        ]);
        return { decision, status: ItemStatus.AVAILABLE };

      case 'HIDE':
        await this.prisma.$transaction([
          this.prisma.item.update({ where: { id: itemId }, data: { status: ItemStatus.HIDDEN } }),
          this.prisma.report.updateMany({
            where: { itemId, status: ReportStatus.PENDING },
            data: { status: ReportStatus.ACCEPTED },
          }),
        ]);
        return { decision, status: ItemStatus.HIDDEN };

      case 'DELETE':
        await this.prisma.item.delete({ where: { id: itemId } });
        await this.imageService.deleteItemPhotos(itemId);
        return { decision, deleted: true };
    }
  }
}
