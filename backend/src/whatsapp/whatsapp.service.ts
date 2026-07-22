import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Envoi via l'API WhatsApp Cloud de Meta. Sans WHATSAPP_ACCESS_TOKEN /
 * WHATSAPP_PHONE_NUMBER_ID (dev local, ou avant que l'utilisateur ait créé
 * son app WhatsApp Business), les messages sont simplement loggés au lieu
 * d'être envoyés — même esprit que EmailService pour Brevo.
 *
 * Contrainte Meta : un message initié par l'app (pas une réponse à un
 * message du client dans les 24h) doit obligatoirement utiliser un
 * "message template" pré-approuvé par Meta Business Manager — impossible
 * d'envoyer du texte libre. Un seul template générique à une variable
 * (le texte de la notification) est utilisé pour tous les types de
 * notification, pour limiter le nombre de templates à faire approuver.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly config: ConfigService) {}

  async sendNotification(to: string, message: string): Promise<void> {
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const templateName = this.config.get<string>('WHATSAPP_TEMPLATE_NAME', 'monstres_notification');
    const languageCode = this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE', 'fr');

    if (!accessToken || !phoneNumberId) {
      this.logger.warn(
        `WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID absent — message WhatsApp non envoyé (loggé pour le dev).\nÀ: ${to}\n${message}`,
      );
      return;
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Échec envoi WhatsApp (${response.status}): ${body}`);
      throw new Error('WHATSAPP_SEND_FAILED');
    }
  }
}
