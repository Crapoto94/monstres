import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { haversineKm } from '../common/geo.util';
import { NotificationType } from '../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

/** Un Item minimal, suffisant pour le matching géographique et l'email. */
interface NotifiableItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  userId: string;
}

/**
 * Zones surveillées (§6.10) : un utilisateur connecté peut surveiller des
 * lieux (nom, position, rayon) et être notifié par email quand un Monstre
 * apparaît dedans. Limites paramétrables via `settings`, jamais en dur.
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    const maxSubscriptions = await this.settings.getNumber('max_user_subscriptions', 5);
    const maxRadius = await this.settings.getNumber('max_subscription_radius', 5000);

    if (dto.radius > maxRadius) {
      throw new BadRequestException(`Le rayon ne peut pas dépasser ${maxRadius} mètres.`);
    }

    const count = await this.prisma.subscription.count({ where: { userId } });
    if (count >= maxSubscriptions) {
      throw new BadRequestException(`Maximum ${maxSubscriptions} zones surveillées.`);
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius: dto.radius,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('Zone surveillée introuvable.');
    if (subscription.userId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres zones surveillées.');
    }
    await this.prisma.subscription.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Appelé à la création d'un Item (§6.10/§6.11) : notifie chaque abonné
   * dont la zone surveillée active couvre la position du nouveau Monstre.
   * Le créateur n'est jamais notifié de son propre Monstre. Un utilisateur
   * avec plusieurs zones qui matchent toutes n'est notifié qu'une seule
   * fois (dédupliqué par userId, pas par zone).
   */
  async notifyNearbySubscribers(item: NotifiableItem): Promise<void> {
    const activeSubscriptions = await this.prisma.subscription.findMany({ where: { active: true } });

    const matchedUserIds = new Set<string>();
    for (const subscription of activeSubscriptions) {
      if (subscription.userId === item.userId) continue;

      const distanceKm = haversineKm(subscription.latitude, subscription.longitude, item.latitude, item.longitude);
      if (distanceKm * 1000 <= subscription.radius) {
        matchedUserIds.add(subscription.userId);
      }
    }

    for (const userId of matchedUserIds) {
      await this.notifications.notify(userId, NotificationType.NEW_ITEM_NEARBY, {
        itemId: item.id,
        itemTitle: item.title,
      });
    }
  }
}
