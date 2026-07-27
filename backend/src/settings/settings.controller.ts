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
      facebookShareEnabled: await this.settingsService.getBoolean('facebook_share_enabled', false),
      facebookGroupUrl: await this.settingsService.getString('facebook_group_url', ''),
      betaModeEnabled: await this.settingsService.getBoolean('beta_mode_enabled', true),
      geoExplanationContent: await this.settingsService.getString('geo_explanation_content', ''),
      addItemDisclaimerContent: await this.settingsService.getString(
        'add_item_disclaimer_content',
        '<p><strong>⚠️ Important :</strong> Les Monstres sert uniquement à signaler des objets déjà présents. Ne dépose pas d\'encombrants sur la voie publique : les dépôts sauvages sont interdits. Pour te débarrasser d\'un objet, utilise les solutions autorisées (déchetterie, collecte des encombrants, ressourcerie, etc.).</p>',
      ),
    };
  }
}
