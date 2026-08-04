import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

const DEFAULT_API_URL = 'https://sms-web.fbc.fr';

/**
 * Envoi via l'API Passerelle SMS (https://sms-web.fbc.fr/docs) — un
 * téléphone Android relié à un forfait SMS illimité fait office de
 * passerelle, le message est mis en file d'attente puis envoyé au
 * prochain cycle de synchronisation (pas d'envoi immédiat garanti).
 *
 * URL, clé API (Bearer, type "web") et préfixe sont des `settings`
 * (jamais en dur) : `sms_api_url`, `sms_api_key`, `sms_prefix`. Sans
 * `sms_api_key` configurée, le SMS est simplement loggé — même esprit que
 * EmailService/WhatsAppService.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly settings: SettingsService) {}

  async sendSms(to: string, message: string): Promise<{ id: number; status: string }> {
    const apiUrl = await this.settings.getString('sms_api_url', DEFAULT_API_URL);
    const apiKey = await this.settings.getString('sms_api_key', '');
    const prefix = await this.settings.getString('sms_prefix', '');

    const fullMessage = prefix ? `${prefix}${message}` : message;

    if (!apiKey) {
      this.logger.warn(
        `sms_api_key absente — SMS non envoyé (loggé pour le dev).\nÀ: ${to}\n${fullMessage}`,
      );
      return { id: 0, status: 'SKIPPED' };
    }

    this.assertHeaderSafe(apiKey, 'sms_api_key');

    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient: to, message: fullMessage }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = (body as { error?: string }).error ?? `HTTP ${response.status}`;
      this.logger.error(`Échec envoi SMS (${response.status}): ${detail}`);
      throw new Error(`SMS_SEND_FAILED:${response.status}:${detail}`);
    }

    return body as { id: number; status: string };
  }

  /**
   * Les en-têtes HTTP doivent être des ByteString (caractères 0-255) —
   * `fetch()` lève sinon une erreur cryptique. Vérification explicite pour
   * transformer ça en message actionnable si la clé a été copiée depuis un
   * éditeur à correction typographique automatique.
   */
  private assertHeaderSafe(value: string, label: string): void {
    for (let i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > 255) {
        throw new Error(
          `${label} contient un caractère invalide en position ${i} (code ${value.charCodeAt(i)}) — ` +
            `vérifie que la valeur ne contient pas de caractère typographique introduit par un copier-coller.`,
        );
      }
    }
  }
}
