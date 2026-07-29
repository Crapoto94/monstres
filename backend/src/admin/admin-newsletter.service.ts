import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import type { SendNewsletterDto } from './dto/send-newsletter.dto';

export interface NewsletterStatus {
  optedInCount: number;
  lastSentAt: string | null;
  frequencyDays: number;
  canSend: boolean;
  reason: string | null;
}

export interface NewsletterResult {
  sentCount: number;
  failedCount: number;
  totalTarget: number;
}

export interface NewsletterHistoryEntry {
  subject: string;
  sentAt: string;
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
}

@Injectable()
export class AdminNewsletterService {
  private readonly logger = new Logger(AdminNewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  async getStatus(): Promise<NewsletterStatus> {
    const optedInCount = await this.prisma.user.count({
      where: { newsletterOptin: true, bannedAt: null, suspendedAt: null },
    });

    const lastSentAt = await this.settings.getString('newsletter_last_sent_at', '');

    const frequencyDays = await this.settings.getNumber('newsletter_frequency_days', 7);

    let canSend = true;
    let reason: string | null = null;

    if (lastSentAt) {
      const lastSent = new Date(lastSentAt);
      const nextAllowed = new Date(lastSent.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
      if (nextAllowed > new Date()) {
        canSend = false;
        const hoursLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / (60 * 60 * 1000));
        reason = `Dernier envoi il y a moins de ${frequencyDays} jours. Prochain envoi possible dans environ ${hoursLeft}h.`;
      }
    }

    return { optedInCount, lastSentAt, frequencyDays, canSend, reason };
  }

  async getHistory(): Promise<NewsletterHistoryEntry[]> {
    const logs = await this.prisma.emailLog.findMany({
      where: { templateKey: 'newsletter' },
      select: { subject: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const campaigns: NewsletterHistoryEntry[] = [];

    for (const log of logs) {
      const logTime = log.createdAt.getTime();
      const existing = campaigns.find(
        (c) => c.subject === log.subject && Math.abs(new Date(c.sentAt).getTime() - logTime) < 60 * 60 * 1000,
      );
      if (existing) {
        existing.totalRecipients++;
        if (log.status === 'SENT') existing.sentCount++;
        else if (log.status === 'FAILED') existing.failedCount++;
      } else {
        campaigns.push({
          subject: log.subject,
          sentAt: log.createdAt.toISOString(),
          sentCount: log.status === 'SENT' ? 1 : 0,
          failedCount: log.status === 'FAILED' ? 1 : 0,
          totalRecipients: 1,
        });
      }
    }

    return campaigns;
  }

  async send(dto: SendNewsletterDto): Promise<NewsletterResult> {
    const users = await this.prisma.user.findMany({
      where: { newsletterOptin: true, bannedAt: null, suspendedAt: null },
      select: { id: true, name: true, email: true },
    });

    if (users.length === 0) {
      return { sentCount: 0, failedCount: 0, totalTarget: 0 };
    }

    const rawHtml = `
<p>Bonjour {{user_name}},</p>
${dto.htmlContent}
<p>— L'équipe Les Monstres</p>
<p><small>Vous recevez ce message car vous êtes inscrit(e) sur Les Monstres et avez accepté de recevoir nos actualités. Pour ne plus en recevoir, désactivez l'option dans votre profil.</small></p>
`;

    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        const personalizedHtml = rawHtml.replace('{{user_name}}', escapeHtml(user.name));
        const htmlContent = await this.emailService.wrapWithMasterTemplate(personalizedHtml);
        await this.emailService.send({
          to: user.email,
          subject: dto.subject,
          htmlContent,
          templateKey: 'newsletter',
        });
        sentCount++;
      } catch (error) {
        this.logger.error(`Échec envoi newsletter à ${user.email}`, error as Error);
        failedCount++;
      }

      // Petite pause tous les 50 envois pour éviter de saturer le serveur SMTP
      if ((sentCount + failedCount) % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    await this.settings.set('newsletter_last_sent_at', new Date().toISOString(), 'STRING');

    return { sentCount, failedCount, totalTarget: users.length };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
