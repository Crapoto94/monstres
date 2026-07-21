import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async verifyEmail(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

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
}
