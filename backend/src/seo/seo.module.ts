import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SeoController } from './seo.controller';

@Module({
  imports: [SettingsModule],
  controllers: [SeoController],
})
export class SeoModule {}
