import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  score: number;
  trustScore: number;
  emailVerifiedAt: Date | null;
  emailNotifications: boolean;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
  createdAt: Date;
}

export interface CommunityMember {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
  createdAt: Date;
  itemsCreated: number;
  itemsReserved: number;
  itemsCollected: number;
  votesReceived: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Profil complet de l'utilisateur connecté (exclut password et tokens). */
  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      score: user.score,
      trustScore: user.trustScore,
      emailVerifiedAt: user.emailVerifiedAt,
      emailNotifications: user.emailNotifications,
      createdAt: user.createdAt,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  }

  /** Profil complet de l'utilisateur connecté, ex. pour GET /auth/me. */
  async findSafeById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return this.toSafeUser(user);
  }

  /** Consentement notifications email (§9 RGPD). */
  async updatePreferences(id: string, emailNotifications: boolean): Promise<SafeUser> {
    const user = await this.prisma.user.update({ where: { id }, data: { emailNotifications } });
    return this.toSafeUser(user);
  }

  /** Mise à jour de l'avatar (emoji ou URL). */
  async updateAvatar(id: string, avatar: string | null): Promise<SafeUser> {
    const user = await this.prisma.user.update({ where: { id }, data: { avatar } });
    return this.toSafeUser(user);
  }

  /** Profil public (§10) : pas d'email ni de trustScore, visible de tous. */
  async findPublicProfile(id: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      score: user.score,
      createdAt: user.createdAt,
    };
  }

  /**
   * Annuaire de la communauté ("Nous") : chaque membre avec ses stats
   * publiques. Demande utilisateur — pas dans une phase précise du cahier
   * des charges, mais dans l'esprit du profil public (§10) et des
   * statistiques "meilleurs contributeurs" prévues côté admin (§14).
   */
  async findCommunity(): Promise<CommunityMember[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        score: true,
        createdAt: true,
        _count: {
          select: {
            items: true,
            reservations: { where: { status: 'COMPLETED' } },
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    return Promise.all(
      users.map(async (user) => {
        const [itemsReserved, votesReceived] = await Promise.all([
          this.prisma.reservation.count({ where: { userId: user.id } }),
          this.prisma.vote.count({ where: { item: { userId: user.id } } }),
        ]);

        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          score: user.score,
          createdAt: user.createdAt,
          itemsCreated: user._count.items,
          itemsReserved,
          itemsCollected: user._count.reservations,
          votesReceived,
        };
      }),
    );
  }
}
