import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { resolveAvatarUrl } from '../common/avatar.util';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private resolveCommentAvatar(comment: any) {
    const imgBaseUrl = this.config.get<string>('IMG_BASE_URL', 'http://localhost:3000/uploads');
    return {
      ...comment,
      user: {
        ...comment.user,
        avatar: resolveAvatarUrl(comment.user.avatar, imgBaseUrl),
      },
    };
  }

  async findByItem(itemId: string, userId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        reactions: { select: { type: true, userId: true } },
      },
    });

    return comments.map((c) => {
      const reactionCounts: Record<string, number> = {};
      const userReactions: Record<string, boolean> = {};
      for (const r of c.reactions) {
        reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
        if (r.userId === userId) userReactions[r.type] = true;
      }

      return {
        ...this.resolveCommentAvatar(c),
        reactionCounts,
        userReactions,
      };
    });
  }

  async create(itemId: string, user: AuthenticatedUser, content: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');

    const comment = await this.prisma.comment.create({
      data: { itemId, userId: user.id, content },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        reactions: { select: { type: true, userId: true } },
      },
    });

    return { ...this.resolveCommentAvatar(comment), reactionCounts: {}, userReactions: {} };
  }

  async toggleReaction(commentId: string, type: string, user: AuthenticatedUser) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable.');

    const existing = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId_type: { commentId, userId: user.id, type: type as any } },
    });

    if (existing) {
      await this.prisma.commentReaction.delete({ where: { id: existing.id } });
      return { action: 'removed', type };
    }

    await this.prisma.commentReaction.create({
      data: { commentId, userId: user.id, type: type as any },
    });
    return { action: 'added', type };
  }

  async remove(commentId: string, user: AuthenticatedUser) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable.');

    const isAuthor = comment.userId === user.id;
    const isAdmin = ADMIN_ROLES.includes(user.role);
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres commentaires.');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }
}
