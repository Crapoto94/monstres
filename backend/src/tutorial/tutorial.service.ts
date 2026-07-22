import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TutorialService {
  constructor(private readonly prisma: PrismaService) {}

  findActivePages() {
    return this.prisma.tutorialPage.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
  }

  async completeOnboarding(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    });
    return { completed: true };
  }
}
