import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getCookieName, getCookieOptions } from '../auth/cookie.util';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CommunityQueryDto } from './dto/community-query.dto';
import { UsersService } from './users.service';
import { ImageService } from '../images/image.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { randomBytes } from 'node:crypto';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 Mo

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly imageService: ImageService,
    private readonly emailService: EmailService,
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  updatePreferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    if (!dto.name && !dto.email) {
      throw new BadRequestException('Rien à mettre à jour.');
    }

    const result = await this.usersService.updateProfile(user.id, dto, async () => {
      const token = randomBytes(32).toString('hex');
      const ttlHours = await this.settings.getNumber('email_verification_token_ttl_hours', 24);
      return { token, ttlHours };
    });

    if (result.emailChanged) {
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser?.emailVerificationToken) {
        try {
          await this.emailService.sendEmailVerification(
            result.email,
            result.name,
            dbUser.emailVerificationToken,
          );
        } catch (error) {
          this.logger.error(`Échec envoi email de vérification à ${result.email}`, error as Error);
        }
      }
    }

    return result;
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  updateAvatar(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAvatarDto) {
    return this.usersService.updateAvatar(user.id, dto.avatar);
  }

  @Post('me/avatar/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_AVATAR_SIZE } }))
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier envoyé.');
    this.imageService.validateFormat(file.mimetype);

    // Vérifier que l'utilisateur est admin OU a au moins 3 monstres
    const itemCount = await this.prisma.item.count({ where: { userId: user.id } });
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (!isAdmin && itemCount < 3) {
      throw new BadRequestException('Tu dois avoir publié au moins 3 Monstres pour uploader un avatar personnalisé.');
    }

    const avatarPath = await this.imageService.processAvatar(file.buffer, user.id);
    return this.usersService.updateAvatar(user.id, avatarPath);
  }

  /**
   * Suppression de compte en libre-service (§9 RGPD, conformité Facebook
   * Login "User Data Deletion"). Supprime le cookie de session dans la
   * foulée : le compte n'existe plus, inutile de laisser un cookie valide.
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteSelf(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    await this.usersService.deleteSelf(user.id);
    res.clearCookie(getCookieName(this.config), getCookieOptions(this.config));
    return { deleted: true };
  }

  @Get()
  getCommunity(@Query() query: CommunityQueryDto) {
    return this.usersService.findCommunity(query.search);
  }

  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }
}
