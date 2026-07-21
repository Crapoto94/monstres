import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageService } from '../images/image.service';
import { ItemStatus, ReportStatus } from '../generated/prisma/enums';
import type { ReportDecision } from './dto/resolve-report.dto';

const DEFAULT_PAGE_SIZE = 20;

/**
 * §6.5/§14 : file de modération. Un Item passe en `PENDING_REVIEW` quand ses
 * signalements « qualité » atteignent `report_threshold` (voir
 * `ReportsService`) ; le modérateur décide alors de conserver, masquer ou
 * supprimer, ce qui referme aussi les signalements PENDING associés.
 */
@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
  ) {}

  async findQueue(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const where = { status: ItemStatus.PENDING_REVIEW };

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, trustScore: true } },
          photos: { orderBy: { order: 'asc' as const }, take: 1 },
          reports: {
            where: { status: ReportStatus.PENDING },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' as const },
          },
        },
        orderBy: { updatedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.item.count({ where }),
    ]);

    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async resolve(itemId: string, decision: ReportDecision) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    if (item.status !== ItemStatus.PENDING_REVIEW) {
      throw new BadRequestException("Ce Monstre n'est pas (ou plus) en file de modération.");
    }

    switch (decision) {
      case 'KEEP':
        await this.prisma.$transaction([
          this.prisma.item.update({ where: { id: itemId }, data: { status: ItemStatus.AVAILABLE } }),
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
