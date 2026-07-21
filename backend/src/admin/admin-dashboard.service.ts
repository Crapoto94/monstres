import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

/** §14 : vue d'ensemble pour l'écran d'accueil admin. */
@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * DAY_MS);
    const since30d = new Date(now.getTime() - 30 * DAY_MS);

    const [
      totalUsers,
      newUsers7d,
      newUsers30d,
      totalItems,
      availableCount,
      reservedCount,
      collectedCount,
      hiddenCount,
      newItems7d,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      this.prisma.user.count({ where: { createdAt: { gte: since30d } } }),
      this.prisma.item.count(),
      this.prisma.item.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.item.count({ where: { status: 'RESERVED' } }),
      this.prisma.item.count({ where: { status: 'COLLECTED' } }),
      this.prisma.item.count({ where: { status: { in: ['HIDDEN', 'PENDING_REVIEW'] } } }),
      this.prisma.item.count({ where: { createdAt: { gte: since7d } } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    const collectionRate = totalItems > 0 ? Math.round((collectedCount / totalItems) * 1000) / 10 : 0;

    return {
      users: { total: totalUsers, new7d: newUsers7d, new30d: newUsers30d },
      items: {
        total: totalItems,
        available: availableCount,
        reserved: reservedCount,
        collected: collectedCount,
        hidden: hiddenCount,
        new7d: newItems7d,
        collectionRate,
      },
      pendingReports,
    };
  }
}
