import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { GeoIpService } from './geoip.service';

@Module({
  imports: [SettingsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, GeoIpService],
})
export class AnalyticsModule {}
