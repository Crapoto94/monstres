import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class AdminImportLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste des passages de la routine (groupés par `runId`) avec un résumé
   * par décision — pour l'écran "occurrences du cron" en admin.
   */
  async findRuns(query: { page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const grouped = await this.prisma.importLogEntry.groupBy({
      by: ['runId'],
      _min: { createdAt: true },
      _count: { _all: true },
      orderBy: { _min: { createdAt: 'desc' } },
    });

    const total = grouped.length;
    const pageRunIds = grouped
      .slice((page - 1) * pageSize, page * pageSize)
      .map((g) => g.runId);

    const entries = pageRunIds.length
      ? await this.prisma.importLogEntry.findMany({
          where: { runId: { in: pageRunIds } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const byRun = new Map<string, typeof entries>();
    for (const entry of entries) {
      const list = byRun.get(entry.runId) ?? [];
      list.push(entry);
      byRun.set(entry.runId, list);
    }

    const runs = pageRunIds.map((runId) => {
      const runEntries = byRun.get(runId) ?? [];
      const counts: Record<string, number> = {};
      for (const e of runEntries) counts[e.decision] = (counts[e.decision] ?? 0) + 1;
      const group = grouped.find((g) => g.runId === runId)!;
      return {
        runId,
        startedAt: group._min.createdAt,
        total: group._count._all,
        machine: runEntries[0]?.machine ?? null,
        counts,
        entries: runEntries,
      };
    });

    return { runs, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
