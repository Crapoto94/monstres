import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class AdminWhatsAppLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: { search?: string; status?: 'SENT' | 'FAILED' | 'SKIPPED'; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ to: { contains: query.search } }, { message: { contains: query.search } }] }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.whatsAppLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.whatsAppLog.count({ where }),
    ]);

    return { logs, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
