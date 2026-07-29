import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  templateKey?: string;
}

type EmailProvider = 'brevo' | 'smtp';

/**
 * Envoi transactionnel via Brevo ou SMTP au choix (§12.9 du cahier des
 * charges). Le provider est choisi via le setting `email_provider` (admin →
 * Paramètres). Les templates sont cherchés en base, avec fallback HTML.
 *
 * Sans provider configuré (dev local), les emails sont loggés.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async send({
    to,
    subject,
    htmlContent,
    templateKey,
  }: SendEmailOptions): Promise<void> {
    const provider = (await this.settings.getString(
      'email_provider',
      'brevo',
    )) as EmailProvider;

    if (provider === 'smtp') {
      await this.sendViaSmtp({ to, subject, htmlContent, templateKey });
    } else {
      await this.sendViaBrevo({ to, subject, htmlContent, templateKey });
    }
  }

  private async sendViaBrevo({
    to,
    subject,
    htmlContent,
    templateKey,
  }: SendEmailOptions): Promise<void> {
    const apiKey = await this.settings.getString('brevo_api_key', '');

    if (!apiKey) {
      this.logger.warn(
        `brevo_api_key vide — email non envoyé (loggé pour le dev).\nÀ: ${to}\nSujet: ${subject}\n${htmlContent}`,
      );
      await this.logEmail({
        to,
        subject,
        htmlContent,
        templateKey,
        status: 'SKIPPED',
      });
      return;
    }

    try {
      const fromEmail = await this.settings.getString(
        'brevo_sender_email',
        'noreply@monstres.app',
      );
      const fromName = await this.settings.getString(
        'brevo_sender_name',
        "Les monstres l'appli",
      );

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Échec envoi Brevo (${response.status}): ${body}`);
        await this.logEmail({
          to,
          subject,
          htmlContent,
          templateKey,
          status: 'FAILED',
          error: `HTTP ${response.status}: ${body}`,
        });
        throw new Error('EMAIL_SEND_FAILED');
      }

      await this.logEmail({
        to,
        subject,
        htmlContent,
        templateKey,
        status: 'SENT',
      });
    } catch (error) {
      if ((error as Error).message !== 'EMAIL_SEND_FAILED') {
        await this.logEmail({
          to,
          subject,
          htmlContent,
          templateKey,
          status: 'FAILED',
          error: (error as Error).message,
        });
      }
      throw error;
    }
  }

  private async sendViaSmtp({
    to,
    subject,
    htmlContent,
    templateKey,
  }: SendEmailOptions): Promise<void> {
    const host = await this.settings.getString('smtp_host', '');

    if (!host) {
      this.logger.warn(
        `smtp_host vide — email non envoyé (loggé pour le dev).\nÀ: ${to}\nSujet: ${subject}\n${htmlContent}`,
      );
      await this.logEmail({
        to,
        subject,
        htmlContent,
        templateKey,
        status: 'SKIPPED',
      });
      return;
    }

    const port = Number(await this.settings.getString('smtp_port', '587'));
    const secure =
      (await this.settings.getString('smtp_secure', 'false')) === 'true';
    const user = await this.settings.getString('smtp_user', '');
    const pass = await this.settings.getString('smtp_pass', '');
    const fromEmail = await this.settings.getString(
      'smtp_from_email',
      'noreply@monstres.app',
    );
    const fromName = await this.settings.getString(
      'smtp_from_name',
      "Les monstres l'appli",
    );

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    try {
      await transporter.verify();
    } catch (error) {
      const smtpErr = (error as Error).message;
      this.logger.error(`Échec connexion SMTP: ${smtpErr}`);
      await this.logEmail({
        to,
        subject,
        htmlContent,
        templateKey,
        status: 'FAILED',
        error: `Connexion SMTP refusée: ${smtpErr}`,
      });
      throw new Error(`EMAIL_SMTP_CONNECT_FAILED: ${smtpErr}`);
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlContent,
      });

      const rejected = Array.isArray(info.rejected) ? info.rejected : [];
      if (rejected.length > 0) {
        this.logger.warn(
          `SMTP a rejeté certains destinataires: ${rejected.join(', ')}`,
        );
        await this.logEmail({
          to,
          subject,
          htmlContent,
          templateKey,
          status: 'FAILED',
          error: `Destinataire rejeté par le serveur SMTP: ${rejected.join(', ')}`,
        });
        throw new Error('EMAIL_RECIPIENT_REJECTED');
      }

      this.logger.log(
        `Email envoyé via SMTP (${host}:${port}) — réponse: ${info.response}`,
      );
      await this.logEmail({
        to,
        subject,
        htmlContent,
        templateKey,
        status: 'SENT',
      });
    } catch (error) {
      if ((error as Error).message === 'EMAIL_RECIPIENT_REJECTED') throw error;
      this.logger.error(`Échec envoi SMTP: ${(error as Error).message}`);
      await this.logEmail({
        to,
        subject,
        htmlContent,
        templateKey,
        status: 'FAILED',
        error: (error as Error).message,
      });
      throw new Error('EMAIL_SEND_FAILED');
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

  async sendEmailVerification(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const url = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/verifier-email?token=${token}`;
    const vars = { user_name: name, verification_url: url };
    const { subject, htmlContent: rawHtml } = await this.renderTemplate(
      'email_verification',
      vars,
      {
        subject: 'Confirme ton adresse email — Les Monstres',
        htmlContent: `
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>Confirme ton adresse email pour activer ton compte Les Monstres :</p>
        <p><a href="${url}">${url}</a></p>
        <p>Ce lien expire dans quelques heures.</p>
      `,
      },
    );
    const htmlContent = await this.wrapWithMasterTemplate(rawHtml);
    await this.send({
      to,
      subject,
      htmlContent,
      templateKey: 'email_verification',
    });
  }

  async sendPasswordReset(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const url = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/reinitialiser-mot-de-passe?token=${token}`;
    const vars = { user_name: name, reset_url: url };
    const { subject, htmlContent: rawHtml } = await this.renderTemplate(
      'password_reset',
      vars,
      {
        subject: 'Réinitialise ton mot de passe — Les Monstres',
        htmlContent: `
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>Une demande de réinitialisation de mot de passe a été effectuée pour ce compte :</p>
        <p><a href="${url}">${url}</a></p>
        <p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      `,
      },
    );
    const htmlContent = await this.wrapWithMasterTemplate(rawHtml);
    await this.send({
      to,
      subject,
      htmlContent,
      templateKey: 'password_reset',
    });
  }

  /** Alerte opérationnelle à l'admin (§ notification nouvel inscrit), pas une notification utilisateur classique — pas de `NotificationType` associé. */
  async sendNewUserAlert(
    to: string,
    newUser: { name: string; email: string },
  ): Promise<void> {
    const adminUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/admin/utilisateurs`;
    const vars = {
      user_name: newUser.name,
      new_user_email: newUser.email,
      admin_url: adminUrl,
    };
    const { subject, htmlContent: rawHtml } = await this.renderTemplate(
      'new_user_registered',
      vars,
      {
        subject: `Nouvel inscrit : ${newUser.name} — Les Monstres`,
        htmlContent: `
        <p>Un nouvel utilisateur vient de s'inscrire sur Les Monstres :</p>
        <p><strong>${escapeHtml(newUser.name)}</strong> — ${escapeHtml(newUser.email)}</p>
        <p><a href="${adminUrl}">Voir dans l'admin →</a></p>
      `,
      },
    );
    const htmlContent = await this.wrapWithMasterTemplate(rawHtml);
    await this.send({
      to,
      subject,
      htmlContent,
      templateKey: 'new_user_registered',
    });
  }

  private async renderTemplate(
    key: string,
    vars: Record<string, string>,
    fallback: { subject: string; htmlContent: string },
  ): Promise<{ subject: string; htmlContent: string }> {
    try {
      const template = await this.prisma.emailTemplate.findUnique({
        where: { key },
      });
      if (!template) return fallback;
      return {
        subject: this.replaceVars(template.subject, vars),
        htmlContent: this.replaceVars(template.htmlContent, vars),
      };
    } catch {
      return fallback;
    }
  }

  async wrapWithMasterTemplate(htmlContent: string): Promise<string> {
    try {
      const master = await this.prisma.emailTemplate.findUnique({
        where: { key: 'master_template' },
      });
      if (!master) return htmlContent;
      const frontendUrl = this.config.get<string>(
        'FRONTEND_URL',
        'http://localhost:5173',
      );
      const logoUrl = `${frontendUrl}/logo-email.png`;
      return master.htmlContent
        .replace(/\{\{content\}\}/g, htmlContent)
        .replace(/\{\{logo_url\}\}/g, logoUrl)
        .replace(/\{\{frontend_url\}\}/g, frontendUrl);
    } catch {
      return htmlContent;
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
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}
