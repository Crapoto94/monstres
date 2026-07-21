import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationStatus, NotificationType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Réserve un Monstre pour l'utilisateur connecté (§6.2).
   * Règles :
   * - Item doit être AVAILABLE
   * - L'utilisateur ne peut pas réserver son propre Monstre
   * - Une seule réservation active par Item
   * - Durée configurable via `reservation_duration_minutes` (défaut 60)
   */
  async reserve(itemId: string, user: AuthenticatedUser) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Monstre introuvable.');
    if (item.status !== 'AVAILABLE') {
      throw new BadRequestException("Ce Monstre n'est plus disponible.");
    }
    if (item.userId === user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas réserver votre propre Monstre.',
      );
    }

    const existingActive = await this.prisma.reservation.findFirst({
      where: { itemId, status: ReservationStatus.ACTIVE },
    });
    if (existingActive) {
      throw new ConflictException('Ce Monstre est déjà réservé.');
    }

    const durationMinutes = await this.settings.getNumber(
      'reservation_duration_minutes',
      60,
    );
    const expiresAt = new Date(Date.now() + durationMinutes * 60_000);

    const reservation = await this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.create({
        data: { itemId, userId: user.id, expiresAt },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'RESERVED', reservedAt: new Date() },
      });
      return r;
    });

    // §6.11 : le propriétaire est notifié qu'un connecté a réservé son Monstre.
    await this.notifications.notify(item.userId, NotificationType.RESERVATION_CREATED, {
      itemId: item.id,
      itemTitle: item.title,
      reserverName: reservation.user.name,
    });

    return {
      id: reservation.id,
      itemId: reservation.itemId,
      user: reservation.user,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };
  }

  /**
   * Annule une réservation active (seul le réservateur peut annuler).
   * L'Item repasse AVAILABLE.
   */
  async cancel(reservationId: string, user: AuthenticatedUser) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { item: true },
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    if (reservation.userId !== user.id) {
      throw new BadRequestException(
        'Vous ne pouvez annuler que vos propres réservations.',
      );
    }
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException("Cette réservation n'est plus active.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      });
      await tx.item.update({
        where: { id: reservation.itemId },
        data: { status: 'AVAILABLE', reservedAt: null },
      });
    });

    return { success: true };
  }

  /**
   * Récupère la réservation active d'un Item (pour l'affichage dans le détail).
   */
  async findActiveForItem(itemId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { itemId, status: ReservationStatus.ACTIVE },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    if (!reservation) return null;
    return {
      id: reservation.id,
      user: reservation.user,
      expiresAt: reservation.expiresAt,
    };
  }

  /**
   * Job planifié (§6.2) : expire les réservations dépassées.
   * `RESERVED → AVAILABLE` pour chaque Item dont la réservation active a expiré.
   * Exécuté toutes les minutes.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleReservationExpirations() {
    const now = new Date();
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lte: now },
      },
    });

    for (const reservation of expiredReservations) {
      await this.prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.EXPIRED },
        });
        await tx.item.update({
          where: { id: reservation.itemId },
          data: { status: 'AVAILABLE', reservedAt: null },
        });
      });
    }
  }
}
