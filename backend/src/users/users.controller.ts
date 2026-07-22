import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { UsersService } from './users.service';
import { ImageService } from '../images/image.service';
import { PrismaService } from '../prisma/prisma.service';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 Mo

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly imageService: ImageService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  updatePreferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(user.id, dto);
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
  getCommunity() {
    return this.usersService.findCommunity();
  }

  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }
}
