import { Controller, Get } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('notices')
  async getNotices() {
    const content = await this.settingsService.getString('legal_notices', '');
    return { content };
  }

  @Get('rgpd')
  async getRgpd() {
    const content = await this.settingsService.getString('rgpd_content', '');
    return { content };
  }
}
