import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  templateKey?: string;
}

/**
 * Envoi transactionnel via l'API Brevo (§12.9 du cahier des charges).
 * Sans BREVO_API_KEY (dev local sans compte Brevo), les emails sont
 * simplement loggés au lieu d'être envoyés — cf. backend/README.md.
 *
 * Les templates sont cherchés en base (table email_templates) par clé.
 * Si le template n'existe pas, fallback sur le HTML codé en dur.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async send({ to, subject, htmlContent, templateKey }: SendEmailOptions): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        `BREVO_API_KEY absent — email non envoyé (loggé pour le dev).\nÀ: ${to}\nSujet: ${subject}\n${htmlContent}`,
      );
      await this.logEmail({ to, subject, htmlContent, templateKey, status: 'SKIPPED' });
      return;
    }

    try {
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
        await this.logEmail({ to, subject, htmlContent, templateKey, status: 'FAILED', error: `HTTP ${response.status}: ${body}` });
        throw new Error('EMAIL_SEND_FAILED');
      }

      await this.logEmail({ to, subject, htmlContent, templateKey, status: 'SENT' });
    } catch (error) {
      if ((error as Error).message !== 'EMAIL_SEND_FAILED') {
        await this.logEmail({ to, subject, htmlContent, templateKey, status: 'FAILED', error: (error as Error).message });
      }
      throw error;
    }
  }

  private async logEmail(entry: {
    to: string;
    subject: string;
    htmlContent: string;
    templateKey?: string;
    status: 'SENT' | 'FAILED' | 'SKIPPED';
    error?: string;
  }): Promise<void> {
    try {
      await this.prisma.emailLog.create({ data: entry });
    } catch (error) {
      this.logger.error("Échec écriture du journal d'emails", error as Error);
    }
  }

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    const url = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/verifier-email?token=${token}`;
    const vars = { user_name: name, verification_url: url };
    const { subject, htmlContent } = await this.renderTemplate('email_verification', vars, {
      subject: 'Confirme ton adresse email — Les Monstres',
      htmlContent: `
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>Confirme ton adresse email pour activer ton compte Les Monstres :</p>
        <p><a href="${url}">${url}</a></p>
        <p>Ce lien expire dans quelques heures.</p>
      `,
    });
    await this.send({ to, subject, htmlContent, templateKey: 'email_verification' });
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const url = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/reinitialiser-mot-de-passe?token=${token}`;
    const vars = { user_name: name, reset_url: url };
    const { subject, htmlContent } = await this.renderTemplate('password_reset', vars, {
      subject: 'Réinitialise ton mot de passe — Les Monstres',
      htmlContent: `
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>Une demande de réinitialisation de mot de passe a été effectuée pour ce compte :</p>
        <p><a href="${url}">${url}</a></p>
        <p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      `,
    });
    await this.send({ to, subject, htmlContent, templateKey: 'password_reset' });
  }

  private async renderTemplate(
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
