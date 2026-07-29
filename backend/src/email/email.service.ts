import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  templateKey?: string;
}

/**
 * Envoi transactionnel via SMTP (§12.9 du cahier des charges).
 * Les templates sont cherchés en base (table email_templates) par clé.
 * Si le template n'existe pas, fallback sur le HTML codé en dur.
 *
 * Config SMTP (dans .env) :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 *   SMTP_FROM_EMAIL, SMTP_FROM_NAME
 *
 * Sans SMTP_HOST configuré (dev local), les emails sont loggés sans être
 * envoyés.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return null;

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASS'),
      },
    });

    return this.transporter;
  }

  async send({
    to,
    subject,
    htmlContent,
    templateKey,
  }: SendEmailOptions): Promise<void> {
    const transporter = this.getTransporter();
    const fromEmail = this.config.get<string>(
      'SMTP_FROM_EMAIL',
      'noreply@monstres.app',
    );
    const fromName = this.config.get<string>(
      'SMTP_FROM_NAME',
      "Les monstres l'appli",
    );

    if (!transporter) {
      this.logger.warn(
        `SMTP_HOST absent — email non envoyé (loggé pour le dev).\nÀ: ${to}\nSujet: ${subject}\n${htmlContent}`,
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
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlContent,
      });

      await this.logEmail({
        to,
        subject,
        htmlContent,
        templateKey,
        status: 'SENT',
      });
    } catch (error) {
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
