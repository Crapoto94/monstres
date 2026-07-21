import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Types d'événements de scoring (§6.8). Chaîne libre en base
 * (`scoring_events.type`), mais on centralise les valeurs connues ici pour
 * éviter les fautes de frappe entre les services qui les émettent.
 */
export const ScoringEventType = {
  USER_CREATED_ITEM: 'USER_CREATED_ITEM',
  USER_COLLECTED_ITEM: 'USER_COLLECTED_ITEM',
  USER_RECEIVED_VOTE: 'USER_RECEIVED_VOTE',
} as const;
export type ScoringEventType = (typeof ScoringEventType)[keyof typeof ScoringEventType];

/**
 * Score utilisateur (§6.8) : chaque action importante génère un événement
 * de scoring et incrémente `User.score` d'autant, dans la même transaction.
 * Barème lu depuis `settings` par les services appelants — jamais en dur ici.
 */
@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async award(userId: string, itemId: string | null, type: ScoringEventType, points: number): Promise<void> {
    if (points === 0) return;
    await this.prisma.$transaction([
      this.prisma.scoringEvent.create({ data: { userId, itemId, type, points } }),
      this.prisma.user.update({ where: { id: userId }, data: { score: { increment: points } } }),
    ]);
  }
}
