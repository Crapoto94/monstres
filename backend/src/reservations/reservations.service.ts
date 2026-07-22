import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReservationStatus, NotificationType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Bascule l'intérêt de l'utilisateur connecté pour un Monstre (toggle,
   * même principe que les votes) — remplace l'ancienne réservation
   * exclusive avec expiration (décision utilisateur) : plusieurs personnes
   * peuvent être intéressées simultanément, sans limite de temps, l'Item
   * ne change plus de statut tant qu'il n'est pas réellement récupéré.
   */
  async toggleInterest(itemId: string, user: AuthenticatedUser) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    if (item.status === 'COLLECTED') {
      throw new BadRequestException('Ce Monstre a déjà été récupéré.');
    }
    if (item.userId === user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas être intéressé par votre propre Monstre.',
      );
    }

    const existing = await this.prisma.reservation.findFirst({
      where: { itemId, userId: user.id, status: ReservationStatus.ACTIVE },
    });

    if (existing) {
      await this.prisma.reservation.update({
        where: { id: existing.id },
        data: { status: ReservationStatus.CANCELLED },
      });
    } else {
      await this.prisma.reservation.create({
        data: { itemId, userId: user.id },
      });

      // §6.11 : le propriétaire est notifié qu'un membre est intéressé par
      // son Monstre (uniquement à l'ajout, pas au retrait, pour limiter le bruit).
      const interested = await this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
      await this.notifications.notify(item.userId, NotificationType.RESERVATION_CREATED, {
        itemId: item.id,
        itemTitle: item.title,
        reserverName: interested?.name ?? 'Un membre',
      });
    }

    const interestedCount = await this.prisma.reservation.count({
      where: { itemId, status: ReservationStatus.ACTIVE },
    });

    return { interested: !existing, interestedCount };
  }
}
