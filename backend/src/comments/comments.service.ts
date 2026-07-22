import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { resolveAvatarUrl } from '../common/avatar.util';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/** Commentaires (§6.6) : simple, connectés uniquement pour écrire. */
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

  async findByItem(itemId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    return comments.map((c) => this.resolveCommentAvatar(c));
  }

  async create(itemId: string, user: AuthenticatedUser, content: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');

    const comment = await this.prisma.comment.create({
      data: { itemId, userId: user.id, content },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    return this.resolveCommentAvatar(comment);
  }

  /** L'auteur du commentaire ou un admin/super admin peut le supprimer (§6.6). */
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
