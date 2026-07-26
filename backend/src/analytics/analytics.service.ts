import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { getClientIp, parseUserAgent } from '../common/utils/request-info.util';
import { GeoIpService } from './geoip.service';
import { RecordPageViewDto } from './dto/record-page-view.dto';

const DAY_MS = 86_400_000;

/**
 * Statistiques de consultation, volontairement anonymisées : ni IP ni
 * User-Agent brut ne sont jamais écrits en base (voir schema.prisma,
 * modèle PageView). `visitorHash` change chaque jour (salage par la date
 * du jour), ce qui permet de compter des visiteurs uniques dans une même
 * journée sans pouvoir suivre une même personne d'un jour à l'autre.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly geoIp: GeoIpService,
  ) {}

  async record(dto: RecordPageViewDto, request: Request, userId: string | null): Promise<void> {
    const ip = getClientIp(request);
    const ua = request.headers['user-agent'];
    const { os, browser, deviceType } = parseUserAgent(ua);
    const { country, city } = this.geoIp.lookup(ip);

    await this.prisma.pageView.create({
      data: {
        path: dto.path,
        itemId: dto.itemId ?? null,
        userId,
        visitorHash: this.hashVisitor(ip, ua),
        country,
        city,
        os,
        browser,
        deviceType,
      },
    });
  }

  private hashVisitor(ip: string | null, ua: string | undefined): string {
    const secret = this.config.get<string>('ANALYTICS_HASH_SECRET', 'change-me-analytics-salt');
    const today = new Date().toISOString().slice(0, 10); // rotation quotidienne du sel
    return createHash('sha256').update(`${ip ?? ''}|${ua ?? ''}|${today}|${secret}`).digest('hex').slice(0, 32);
  }

  /** Purge les statistiques au-delà de la période de rétention (§ paramètres admin). */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeOldPageViews(): Promise<void> {
    const days = await this.settings.getNumber('analytics_retention_days', 180);
    const cutoff = new Date(Date.now() - days * DAY_MS);
    const { count } = await this.prisma.pageView.deleteMany({ where: { createdAt: { lt: cutoff } } });
    if (count > 0) this.logger.log(`${count} vue(s) de plus de ${days} jours purgée(s).`);
  }
}
