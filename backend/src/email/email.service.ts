import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

/**
 * Envoi transactionnel via l'API Brevo (§12.9 du cahier des charges).
 * Sans BREVO_API_KEY (dev local sans compte Brevo), les emails sont
 * simplement loggés au lieu d'être envoyés — cf. backend/README.md.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send({ to, subject, htmlContent }: SendEmailOptions): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        `BREVO_API_KEY absent — email non envoyé (loggé pour le dev).\nÀ: ${to}\nSujet: ${subject}\n${htmlContent}`,
      );
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: this.config.get<string>('BREVO_SENDER_NAME', 'Les Monstres'),
          email: this.config.getOrThrow<string>('BREVO_SENDER_EMAIL'),
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Échec envoi Brevo (${response.status}): ${body}`);
      throw new Error('EMAIL_SEND_FAILED');
    }
  }

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    const url = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/verifier-email?token=${token}`;
    await this.send({
      to,
      subject: 'Confirme ton adresse email — Les Monstres',
      htmlContent: `
        <p>Bonjour ${name},</p>
        <p>Confirme ton adresse email pour activer ton compte Les Monstres :</p>
        <p><a href="${url}">${url}</a></p>
        <p>Ce lien expire dans quelques heures.</p>
      `,
    });
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const url = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/reinitialiser-mot-de-passe?token=${token}`;
    await this.send({
      to,
      subject: 'Réinitialise ton mot de passe — Les Monstres',
      htmlContent: `
        <p>Bonjour ${name},</p>
        <p>Une demande de réinitialisation de mot de passe a été effectuée pour ce compte :</p>
        <p><a href="${url}">${url}</a></p>
        <p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      `,
    });
  }
}
