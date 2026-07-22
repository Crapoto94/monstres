import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

/** Template de secours fourni par défaut par Meta — toujours pré-approuvé, sans variable. */
const TEST_TEMPLATE_NAME = 'hello_world';
const TEST_TEMPLATE_LANGUAGE = 'en_US';

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
 *
 * Réglage `whatsapp_test_mode` (admin → Paramètres) : le temps que
 * `monstres_notification` soit approuvé par Meta (l'examen peut prendre
 * jusqu'à 24-48h), bascule l'envoi sur `hello_world` — le template de
 * démo fourni par Meta, toujours pré-approuvé — pour vérifier que la
 * chaîne d'envoi fonctionne. Le contenu réel de la notification est alors
 * ignoré (hello_world n'accepte aucune variable) ; à désactiver dès que le
 * vrai template est approuvé pour recevoir le contenu réel des notifications.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async sendNotification(to: string, message: string): Promise<void> {
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      this.logger.warn(
        `WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID absent — message WhatsApp non envoyé (loggé pour le dev).\nÀ: ${to}\n${message}`,
      );
      return;
    }

    const testMode = await this.settings.getBoolean('whatsapp_test_mode', false);
    const templateName = testMode
      ? TEST_TEMPLATE_NAME
      : this.config.get<string>('WHATSAPP_TEMPLATE_NAME', 'monstres_notification');
    const languageCode = testMode
      ? TEST_TEMPLATE_LANGUAGE
      : this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE', 'fr');

    if (testMode) {
      this.logger.warn(`whatsapp_test_mode actif — envoi de "hello_world" au lieu du vrai contenu à ${to}.`);
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
          ...(testMode ? {} : { components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }] }),
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
