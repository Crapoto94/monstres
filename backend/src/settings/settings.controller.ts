import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * Route publique (pas d'auth) : la SPA doit pouvoir lire `pwaEnabled` dès
 * le boot, avant toute connexion, pour décider d'enregistrer ou non le
 * service worker.
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  async getPublicSettings() {
    return {
      pwaEnabled: await this.settingsService.getBoolean('pwa_enabled', true),
    };
  }
}
