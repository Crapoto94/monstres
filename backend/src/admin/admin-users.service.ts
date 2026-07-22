import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageService } from '../images/image.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

const DEFAULT_PAGE_SIZE = 20;
const ELEVATED_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly imageService: ImageService,
  ) {}

  async findMany(query: { search?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = query.search
      ? { OR: [{ name: { contains: query.search } }, { email: { contains: query.search } }] }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          score: true,
          trustScore: true,
          emailVerifiedAt: true,
          suspendedAt: true,
          bannedAt: true,
          createdAt: true,
          lastLoginAt: true,
          registrationIp: true,
          registrationOs: true,
          registrationBrowser: true,
          _count: { select: { items: true, reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { items: true, reservations: true, votes: true, comments: true } } },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const reportsReceived = await this.prisma.report.count({ where: { item: { userId: id } } });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safe } = user;

    return { ...safe, reportsReceived };
  }

  async updateRole(id: string, role: UserRole, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);

    // Seul un SUPER_ADMIN peut accorder ou retirer un rôle ADMIN/SUPER_ADMIN.
    if ((ELEVATED_ROLES.includes(role) || ELEVATED_ROLES.includes(target.role)) && actingUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul un Super Administrateur peut gérer les rôles administrateurs.');
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { role } });
    return this.usersService.toSafeUser(updated);
  }

  async suspend(id: string, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    const updated = await this.prisma.user.update({ where: { id }, data: { suspendedAt: new Date() } });
    return this.usersService.toSafeUser(updated);
  }

  async unsuspend(id: string) {
    await this.findOrThrow(id);
    const updated = await this.prisma.user.update({ where: { id }, data: { suspendedAt: null } });
    return this.usersService.toSafeUser(updated);
  }

  async ban(id: string, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    const updated = await this.prisma.user.update({ where: { id }, data: { bannedAt: new Date() } });
    return this.usersService.toSafeUser(updated);
  }

  async unban(id: string) {
    await this.findOrThrow(id);
    const updated = await this.prisma.user.update({ where: { id }, data: { bannedAt: null } });
    return this.usersService.toSafeUser(updated);
  }

  /** Suppression définitive (§14, réservée SUPER_ADMIN) : cascade DB + photos des Monstres de l'utilisateur. */
  async remove(id: string, actingUser: AuthenticatedUser) {
    const target = await this.findOrThrow(id);
    this.assertCanModerate(actingUser, target);
    if (actingUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul un Super Administrateur peut supprimer un compte.');
    }

    const itemIds = (await this.prisma.item.findMany({ where: { userId: id }, select: { id: true } })).map((i) => i.id);
    await this.prisma.user.delete({ where: { id } });
    await Promise.all(itemIds.map((itemId) => this.imageService.deleteItemPhotos(itemId)));

    return { deleted: true };
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
  private assertCanModerate(actingUser: AuthenticatedUser, target: { id: string; role: UserRole }) {
    if (target.id === actingUser.id) {
      throw new BadRequestException('Vous ne pouvez pas effectuer cette action sur votre propre compte.');
    }
    if (ELEVATED_ROLES.includes(target.role) && actingUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul un Super Administrateur peut modérer un compte administrateur.');
    }
  }
}
