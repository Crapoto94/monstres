import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

class TestEmailDto {
  @IsEmail()
  to: string;
}

@Controller('admin/test-email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminTestEmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async sendTest(@Body() dto: TestEmailDto) {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const master = await this.prisma.emailTemplate.findUnique({
      where: { key: 'master_template' },
    });
    const logoUrl = `${frontendUrl}/logo-email.png`;

    let html = master?.htmlContent ?? '';
    if (html) {
      html = html
        .replace(
          /\{\{content\}\}/g,
          '<p>Email de test — Les Monstres</p><p>Si tu reçois ce message, la configuration email fonctionne correctement.</p>',
        )
        .replace(/\{\{logo_url\}\}/g, logoUrl)
        .replace(/\{\{frontend_url\}\}/g, frontendUrl);
    }

    await this.emailService.send({
      to: dto.to,
      subject: 'Test email — Les Monstres',
      htmlContent: html || '<p>Email de test — configuration OK.</p>',
    });

    return { success: true, message: 'Email de test envoyé.' };
  }
}
