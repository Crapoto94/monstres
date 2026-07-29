import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class AdminCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: { search?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = query.search ? { content: { contains: query.search } } : {};

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        select: {
          id: true,
          content: true,
          createdAt: true,
          userId: true,
          itemId: true,
          user: { select: { id: true, name: true, email: true, avatar: true } },
          item: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      comments,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async remove(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Commentaire introuvable.');

    await this.prisma.comment.delete({ where: { id } });
    return { deleted: true };
  }
}
