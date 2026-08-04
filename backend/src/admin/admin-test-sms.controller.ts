import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SmsService } from '../sms/sms.service';

class TestSmsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9 ]{6,20}$/, {
    message: 'Numéro invalide (ex. +33612345678).',
  })
  to: string;
}

@Controller('admin/test-sms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminTestSmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post()
  async sendTest(@Body() dto: TestSmsDto) {
    try {
      const result = await this.smsService.sendSms(
        dto.to,
        'Message de test — Les Monstres. Si tu reçois ce SMS, la configuration fonctionne correctement.',
      );
      if (result.status === 'SKIPPED') {
        throw new BadRequestException(
          "Aucune clé API SMS configurée (sms_api_key) — le SMS n'a pas été envoyé.",
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const msg = (error as Error).message;
      if (msg.startsWith('SMS_SEND_FAILED:')) {
        const [, status, detail] = msg.split(':');
        if (status === '401') {
          throw new BadRequestException(
            `Clé API SMS manquante ou invalide : ${detail}. Vérifie sms_api_key.`,
          );
        }
        if (status === '403') {
          throw new BadRequestException(
            `Clé API SMS révoquée, expirée ou de mauvais type (doit être "web") : ${detail}.`,
          );
        }
        if (status === '400') {
          throw new BadRequestException(`Requête invalide : ${detail}.`);
        }
        throw new BadRequestException(`Échec de l'envoi (HTTP ${status}) : ${detail}.`);
      }
      throw new BadRequestException(
        `Échec de l'envoi : ${msg}. Vérifie l'URL de l'API SMS (sms_api_url).`,
      );
    }

    return { success: true, message: 'SMS de test mis en file d\'attente avec succès.' };
  }
}
