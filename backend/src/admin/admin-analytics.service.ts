import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

interface CountRow {
  key: string;
  count: number;
}

function topN(counts: Map<string, number>, n: number): CountRow[] {
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * KPI de consultation pour l'admin (§ statistiques). Toutes les données
 * viennent de `PageView`, déjà anonymisé à l'écriture (voir AnalyticsService)
 * — rien ici ne manipule d'IP ni de User-Agent brut.
 *
 * Le comptage de "visiteurs uniques" au-delà d'une seule journée est une
 * approximation par construction : `visitorHash` change chaque jour, donc un
 * même visiteur revenant plusieurs jours de suite compte plusieurs fois sur
 * une période de plusieurs jours. C'est le prix du choix "anonymisé" — voir
 * PROGRESS.md.
 */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(days: number) {
    const since = new Date(Date.now() - days * DAY_MS);
    const where = { createdAt: { gte: since } };

    const rows = await this.prisma.pageView.findMany({
      where,
      select: {
        createdAt: true,
        path: true,
        itemId: true,
        userId: true,
        visitorHash: true,
        country: true,
        os: true,
        browser: true,
        deviceType: true,
      },
    });

    const dailyViews = new Map<string, number>();
    const dailyVisitors = new Map<string, Set<string>>();
    const byPath = new Map<string, number>();
    const byItem = new Map<string, number>();
    const byOs = new Map<string, number>();
    const byBrowser = new Map<string, number>();
    const byDevice = new Map<string, number>();
    const byCountry = new Map<string, number>();
    const byUser = new Map<string, number>();
    const allVisitors = new Set<string>();
    let loggedInViews = 0;

    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      dailyViews.set(day, (dailyViews.get(day) ?? 0) + 1);
      if (!dailyVisitors.has(day)) dailyVisitors.set(day, new Set());
      dailyVisitors.get(day)!.add(row.visitorHash);
      allVisitors.add(row.visitorHash);

      byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
      if (row.itemId) byItem.set(row.itemId, (byItem.get(row.itemId) ?? 0) + 1);
      byOs.set(row.os, (byOs.get(row.os) ?? 0) + 1);
      byBrowser.set(row.browser, (byBrowser.get(row.browser) ?? 0) + 1);
      byDevice.set(row.deviceType, (byDevice.get(row.deviceType) ?? 0) + 1);
      if (row.country) byCountry.set(row.country, (byCountry.get(row.country) ?? 0) + 1);
      if (row.userId) {
        loggedInViews += 1;
        byUser.set(row.userId, (byUser.get(row.userId) ?? 0) + 1);
      }
    }

    const dailySeries: { date: string; views: number; uniqueVisitors: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
      dailySeries.push({
        date,
        views: dailyViews.get(date) ?? 0,
        uniqueVisitors: dailyVisitors.get(date)?.size ?? 0,
      });
    }

    const topItemsRaw = topN(byItem, 10);
    const items = topItemsRaw.length
      ? await this.prisma.item.findMany({
          where: { id: { in: topItemsRaw.map((r) => r.key) } },
          select: { id: true, title: true },
        })
      : [];
    const itemTitleById = new Map(items.map((i) => [i.id, i.title]));

    const topUsersRaw = topN(byUser, 10);
    const users = topUsersRaw.length
      ? await this.prisma.user.findMany({
          where: { id: { in: topUsersRaw.map((r) => r.key) } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      rangeDays: days,
      totalViews: rows.length,
      uniqueVisitorsApprox: allVisitors.size,
      loggedInViews,
      anonymousViews: rows.length - loggedInViews,
      dailySeries,
      topPages: topN(byPath, 10).map((r) => ({ path: r.key, views: r.count })),
      topItems: topItemsRaw.map((r) => ({
        itemId: r.key,
        title: itemTitleById.get(r.key) ?? null,
        views: r.count,
      })),
      topUsers: topUsersRaw.map((r) => ({
        userId: r.key,
        name: userById.get(r.key)?.name ?? null,
        email: userById.get(r.key)?.email ?? null,
        views: r.count,
      })),
      byOs: topN(byOs, 8).map((r) => ({ label: r.key, count: r.count })),
      byBrowser: topN(byBrowser, 8).map((r) => ({ label: r.key, count: r.count })),
      byDevice: topN(byDevice, 5).map((r) => ({ label: r.key, count: r.count })),
      byCountry: topN(byCountry, 15).map((r) => ({ label: r.key, count: r.count })),
    };
  }
}
