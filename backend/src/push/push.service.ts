import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';

/**
 * Notifications Web Push (opt-in explicite depuis le profil — voir
 * ProfileView). Fonctionne même app/onglet fermé grâce au service worker,
 * y compris sur iOS si l'app a été ajoutée à l'écran d'accueil. Sans clés
 * VAPID configurées, les envois sont simplement loggés (même esprit que
 * EmailService/WhatsAppService).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:no-reply@monstres.fbc.fr');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    }
  }

  getPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  async subscribe(userId: string, dto: CreatePushSubscriptionDto, userAgent?: string): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /** Envoie à tous les appareils abonnés de l'utilisateur ; supprime les abonnements expirés (410/404). */
  async sendToUser(userId: string, payload: { title: string; body: string; url: string }): Promise<void> {
    if (!this.configured) {
      this.logger.warn(`VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY absent — notification push non envoyée (loggée).\n${payload.title}: ${payload.body}`);
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          } else {
            this.logger.error(`Échec envoi push à l'abonnement ${sub.id}`, error as Error);
          }
        }
      }),
    );
  }
}
