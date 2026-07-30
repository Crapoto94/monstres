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

    // Au plus une réaction par utilisateur par commentaire.
    // Si l'utilisateur a déjà une réaction sur ce commentaire :
    //   - même type → suppression (toggle off)
    //   - type différent → remplacement (supprime l'ancienne, ajoute la nouvelle)
    const allUserReactions = await this.prisma.commentReaction.findMany({
      where: { commentId, userId: user.id },
    });

    const sameType = allUserReactions.find((r) => r.type === type);
    const otherType = allUserReactions.find((r) => r.type !== type);

    if (sameType) {
      await this.prisma.commentReaction.delete({ where: { id: sameType.id } });
      return { action: 'removed', type };
    }

    if (otherType) {
      await this.prisma.commentReaction.delete({ where: { id: otherType.id } });
    }

    await this.prisma.commentReaction.create({
      data: { commentId, userId: user.id, type: type as any },
    });

    return { action: otherType ? 'replaced' : 'added', type, previousType: otherType?.type ?? null };
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
