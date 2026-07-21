import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateSettingDto } from './dto/update-setting.dto';

/**
 * §14 : paramètres modifiables sans déploiement (durées, seuils, points,
 * poids de classement…). Réservé ADMIN/SUPER_ADMIN — une valeur mal
 * renseignée peut casser le comportement de l'app, pas de garde-fou par clé.
 */
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Patch(':key')
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    const existing = await this.settingsService.findByKey(key);
    await this.settingsService.set(key, dto.value, dto.type ?? existing?.type);
    return this.settingsService.findByKey(key);
  }
}
