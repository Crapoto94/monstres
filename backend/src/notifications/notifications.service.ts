import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../generated/prisma/enums';

/**
 * Contenu (structuré) de chaque type de notification (§6.11). Le champ
 * `data` de la table `notifications` stocke ce même objet en JSON, pour un
 * historique consultable sans recharger le Monstre concerné.
 */
export interface NotificationData {
  RESERVATION_CREATED: { itemId: string; itemTitle: string; reserverName: string };
  ITEM_COLLECTED: { itemId: string; itemTitle: string; collectorName: string };
  NEW_ITEM_NEARBY: { itemId: string; itemTitle: string; itemPhotoUrl: string | null };
  BADGE_UNLOCKED: { badgeName: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Enregistre la notification en base (historique, toujours conservé) et
   * envoie l'email correspondant si l'utilisateur n'a pas désactivé les
   * notifications email (§9 RGPD : consentement "notifications email
   * oui/non"). Un échec d'envoi d'email ne fait jamais échouer l'action
   * déclenchante (réservation, récupération…) — même esprit que §11 pour
   * Facebook : on log et on continue.
   */
  async notify<T extends NotificationType>(
    userId: string,
    type: T,
    data: NotificationData[T],
  ): Promise<void> {
    await this.prisma.notification.create({
      data: { userId, type, data: JSON.stringify(data) },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.emailNotifications) return;

    try {
      const { subject, htmlContent } = await this.buildEmail(type, data);
      await this.emailService.send({ to: user.email, subject, htmlContent });
    } catch (error) {
      this.logger.error(`Échec envoi email de notification (${type}) à ${user.email}`, error as Error);
    }
  }

  async findMine(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return notifications.map((n) => ({ ...n, data: JSON.parse(n.data) }));
  }

  async markAsRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { read: true };
  }

  private async buildEmail(type: NotificationType, data: unknown): Promise<{ subject: string; htmlContent: string }> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');

    switch (type) {
      case NotificationType.RESERVATION_CREATED: {
        const d = data as NotificationData['RESERVATION_CREATED'];
        const vars = {
          user_name: '',
          item_title: d.itemTitle,
          item_url: `${frontendUrl}/monstres/${d.itemId}`,
          reserver_name: d.reserverName,
          collector_name: '',
          badge_name: '',
          verification_url: '',
          reset_url: '',
          item_photo_url: '',
        };
        return this.renderWithFallback('reservation_created', vars, {
          subject: `${d.reserverName} a réservé ton Monstre — Les Monstres`,
          htmlContent: `<p>Ton Monstre « ${escapeHtml(d.itemTitle)} » vient d'être réservé par ${escapeHtml(d.reserverName)}.</p>`,
        });
      }
      case NotificationType.ITEM_COLLECTED: {
        const d = data as NotificationData['ITEM_COLLECTED'];
        const vars = {
          user_name: '',
          item_title: d.itemTitle,
          item_url: `${frontendUrl}/monstres/${d.itemId}`,
          reserver_name: '',
          collector_name: d.collectorName,
          badge_name: '',
          verification_url: '',
          reset_url: '',
          item_photo_url: '',
        };
        return this.renderWithFallback('item_collected', vars, {
          subject: `Ton Monstre a été récupéré — Les Monstres`,
          htmlContent: `<p>Ton Monstre « ${escapeHtml(d.itemTitle)} » a été récupéré par ${escapeHtml(d.collectorName)}. Merci d'avoir participé au réemploi !</p>`,
        });
      }
      case NotificationType.NEW_ITEM_NEARBY: {
        const d = data as NotificationData['NEW_ITEM_NEARBY'];
        const itemUrl = `${frontendUrl}/monstres/${d.itemId}`;
        const vars = {
          user_name: '',
          item_title: d.itemTitle,
          item_url: itemUrl,
          reserver_name: '',
          collector_name: '',
          badge_name: '',
          verification_url: '',
          reset_url: '',
          item_photo_url: d.itemPhotoUrl ?? '',
        };
        return this.renderWithFallback('new_item_nearby', vars, {
          subject: `Nouveau Monstre près de chez toi — Les Monstres`,
          htmlContent: `
            <p>Un nouveau Monstre « ${escapeHtml(d.itemTitle)} » est apparu près d'une de tes zones surveillées.</p>
            ${d.itemPhotoUrl ? `<p><a href="${itemUrl}"><img src="${d.itemPhotoUrl}" alt="${escapeHtml(d.itemTitle)}" style="max-width:300px;border-radius:8px;" /></a></p>` : ''}
            <p><a href="${itemUrl}">Voir ce Monstre</a></p>
          `,
        });
      }
      case NotificationType.BADGE_UNLOCKED: {
        const d = data as NotificationData['BADGE_UNLOCKED'];
        const vars = {
          user_name: '',
          item_title: '',
          item_url: '',
          reserver_name: '',
          collector_name: '',
          badge_name: d.badgeName,
          verification_url: '',
          reset_url: '',
          item_photo_url: '',
        };
        return this.renderWithFallback('badge_unlocked', vars, {
          subject: `Badge débloqué : ${d.badgeName} — Les Monstres`,
          htmlContent: `<p>Bravo, tu as débloqué le badge « ${escapeHtml(d.badgeName)} » !</p>`,
        });
      }
    }
  }

  private async renderWithFallback(
    key: string,
    vars: Record<string, string>,
    fallback: { subject: string; htmlContent: string },
  ): Promise<{ subject: string; htmlContent: string }> {
    try {
      const template = await this.prisma.emailTemplate.findUnique({ where: { key } });
      if (!template) return fallback;
      return {
        subject: this.replaceVars(template.subject, vars),
        htmlContent: this.replaceVars(template.htmlContent, vars),
      };
    } catch {
      return fallback;
    }
  }

  private replaceVars(text: string, vars: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, escapeHtml(value));
    }
    return result;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
