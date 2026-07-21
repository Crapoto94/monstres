import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ScoringService, ScoringEventType } from '../scoring/scoring.service';
import { VoteType } from '../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

/**
 * Votes communautaires (§6.4) : réaction positive unique « interesting »,
 * réservée aux connectés. Bouton bascule (voter/retirer son vote) —
 * `votes.itemId+userId+type` est unique en base (schéma Phase 0).
 */
@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly scoring: ScoringService,
  ) {}

  async toggle(itemId: string, user: AuthenticatedUser) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    if (item.userId === user.id) {
      throw new BadRequestException('Vous ne pouvez pas voter pour votre propre Monstre.');
    }

    const existing = await this.prisma.vote.findUnique({
      where: { itemId_userId_type: { itemId, userId: user.id, type: VoteType.INTERESTING } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.vote.delete({ where: { id: existing.id } }),
        this.prisma.item.update({ where: { id: itemId }, data: { votesScore: { decrement: 1 } } }),
      ]);
      return { voted: false, votesScore: item.votesScore - 1 };
    }

    await this.prisma.$transaction([
      this.prisma.vote.create({ data: { itemId, userId: user.id, type: VoteType.INTERESTING } }),
      this.prisma.item.update({ where: { id: itemId }, data: { votesScore: { increment: 1 } } }),
    ]);

    // Points accordés au propriétaire du Monstre pour chaque vote reçu
    // (§6.8). Pas de retrait de points si le vote est retiré ensuite — un
    // événement de scoring reste un fait acquis, pas un compteur live (même
    // logique que pour la création/récupération).
    const pointsVoteUtile = await this.settings.getNumber('points_vote_utile', 1);
    await this.scoring.award(item.userId, itemId, ScoringEventType.USER_RECEIVED_VOTE, pointsVoteUtile);

    return { voted: true, votesScore: item.votesScore + 1 };
  }
}
