import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ImageService } from '../images/image.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { UserRole } from '../generated/prisma/enums';
import { resolveAvatarUrl } from '../common/avatar.util';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

const DEFAULT_PAGE_SIZE = 20;
const ELEVATED_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly imageService: ImageService,
    private readonly emailService: EmailService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  async findMany(query: { search?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          score: true,
          trustScore: true,
          emailVerifiedAt: true,
          suspendedAt: true,
          bannedAt: true,
          createdAt: true,
          lastLoginAt: true,
          lastLoginIp: true,
          lastLoginOs: true,
          lastLoginBrowser: true,
          registrationIp: true,
          registrationOs: true,
          registrationBrowser: true,
          loginCount: true,
          _count: {
            select: {
              items: true,
              reports: true,
              comments: true,
              subscriptions: true,
              notifications: { where: { type: 'NEW_ITEM_NEARBY' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Compter les signalements SOUMIS par chaque utilisateur
    const userIds = users.map((u) => u.id);
    const submittedCounts = await this.prisma.report.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { id: true },
    });
    const submittedMap = new Map(
      submittedCounts.map((r) => [r.userId, r._count.id]),
    );
    const imgBaseUrl = this.config.get<string>(
      'IMG_BASE_URL',
      'http://localhost:3000/uploads',
    );
    const usersWithSubmitted = users.map((u) => ({
      ...u,
      avatar: resolveAvatarUrl(u.avatar, imgBaseUrl),
      reportsSubmitted: submittedMap.get(u.id) ?? 0,
    }));

    return {
      users: usersWithSubmitted,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
            reservations: true,
            votes: true,
            comments: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const reportsReceived = await this.prisma.report.count({
      where: { item: { userId: id } },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safe } = user;

    return { ...safe, reportsReceived };
  }

  async updateRole(id: string, role: UserRole, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);

    // Seul un SUPER_ADMIN peut accorder ou retirer un rôle ADMIN/SUPER_ADMIN.
    if (
      (ELEVATED_ROLES.includes(role) || ELEVATED_ROLES.includes(target.role)) &&
      actingUser.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Seul un Super Administrateur peut gérer les rôles administrateurs.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
    });
    return this.usersService.toSafeUser(updated);
  }

  async suspend(id: string, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { suspendedAt: new Date() },
    });
    return this.usersService.toSafeUser(updated);
  }

  async unsuspend(id: string) {
    await this.findOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { suspendedAt: null },
    });
    return this.usersService.toSafeUser(updated);
  }

  async ban(id: string, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { bannedAt: new Date() },
    });
    return this.usersService.toSafeUser(updated);
  }

  async unban(id: string) {
    await this.findOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { bannedAt: null },
    });
    return this.usersService.toSafeUser(updated);
  }

  /** Suppression définitive (§14, réservée SUPER_ADMIN) : cascade DB + photos des Monstres de l'utilisateur. */
  async remove(id: string, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    if (actingUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Seul un Super Administrateur peut supprimer un compte.',
      );
    }

    const itemIds = (
      await this.prisma.item.findMany({
        where: { userId: id },
        select: { id: true },
      })
    ).map((i) => i.id);
    await this.prisma.user.delete({ where: { id } });
    await Promise.all(
      itemIds.map((itemId) => this.imageService.deleteItemPhotos(itemId)),
    );

    return { deleted: true };
  }

  /**
   * Édition du nom/email d'un compte quelconque par un admin. Réutilise
   * `UsersService.updateProfile` (même logique que l'auto-édition côté
   * utilisateur) : un changement d'email remet `emailVerifiedAt` à zéro et
   * génère un nouveau lien de vérification, envoyé au titulaire — même un
   * admin ne peut pas s'attribuer silencieusement un email non prouvé.
   */
  async updateProfile(
    id: string,
    updates: { name?: string; email?: string },
    actingUser: AuthenticatedUser,
  ) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    if (updates.name === undefined && updates.email === undefined) {
      throw new BadRequestException('Rien à mettre à jour.');
    }

    const result = await this.usersService.updateProfile(id, updates, async () => {
      const token = randomBytes(32).toString('hex');
      const ttlHours = await this.settings.getNumber('email_verification_token_ttl_hours', 24);
      return { token, ttlHours };
    });

    if (result.emailChanged) {
      const dbUser = await this.prisma.user.findUnique({ where: { id } });
      if (dbUser?.emailVerificationToken) {
        try {
          await this.emailService.sendEmailVerification(
            result.email,
            result.name,
            dbUser.emailVerificationToken,
          );
        } catch (error) {
          this.logger.error(`Échec envoi email de vérification à ${result.email}`, error as Error);
        }
      }
    }

    return result;
  }

  /** Avatar emoji/préréglage (même DTO que l'auto-édition). */
  async updateAvatar(id: string, avatar: string | null, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    return this.usersService.updateAvatar(id, avatar);
  }

  /**
   * Upload d'une photo de profil pour n'importe quel compte — sans le
   * quota "3 Monstres publiés" qui s'applique à l'auto-upload (§10), un
   * admin doit pouvoir corriger n'importe quel avatar dès maintenant.
   */
  async uploadAvatar(id: string, file: Express.Multer.File | undefined, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    if (!file) throw new BadRequestException('Aucun fichier envoyé.');
    this.imageService.validateFormat(file.mimetype);

    const avatarPath = await this.imageService.processAvatar(file.buffer, id);
    return this.usersService.updateAvatar(id, avatarPath);
  }

  async verifyEmail(id: string) {
    const user = await this.findOrThrow(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return this.usersService.toSafeUser(updated);
  }

  private async findOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  /** §5 : un admin ne peut pas s'auto-modérer, ni modérer un pair de rang égal ou supérieur sans être SUPER_ADMIN. */
  private assertCanModerate(
    actingUser: AuthenticatedUser,
    target: { id: string; role: UserRole },
  ) {
    if (target.id === actingUser.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas effectuer cette action sur votre propre compte.',
      );
    }
    if (
      ELEVATED_ROLES.includes(target.role) &&
      actingUser.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Seul un Super Administrateur peut modérer un compte administrateur.',
      );
    }
  }
}
