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
  createdAt: Date;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
  createdAt: Date;
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
      createdAt: user.createdAt,
    };
  }

  /** Profil complet de l'utilisateur connecté, ex. pour GET /auth/me. */
  async findSafeById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
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
}
