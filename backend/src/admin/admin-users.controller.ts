import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AdminUsersService } from './admin-users.service';
import { AdminListUsersQueryDto } from './dto/admin-list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { UpdateAvatarDto } from '../users/dto/update-avatar.dto';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 Mo — même limite que l'auto-upload (users/me/avatar/upload).

/**
 * Espace admin (préfixe séparé du reste). Réservé ADMIN/SUPER_ADMIN par
 * défaut — voir §5 du cahier des charges pour les rôles. Certaines actions
 * (rôles admin, suppression) sont resserrées à SUPER_ADMIN dans le service.
 * La lecture et la suspension temporaire sont en revanche ouvertes au
 * MODERATOR (§5 : « traite les signalements... sanctionne »), pour lui
 * permettre d'agir depuis la file de modération (`AdminReportsController`)
 * sans lui donner accès au bannissement définitif, aux rôles ou à la
 * suppression de compte.
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles('MODERATOR', 'ADMIN', 'SUPER_ADMIN')
  findAll(@Query() query: AdminListUsersQueryDto) {
    return this.adminUsersService.findMany(query);
  }

  @Get(':id')
  @Roles('MODERATOR', 'ADMIN', 'SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  /** Valide manuellement l'email d'un compte en attente (email jamais reçu, etc.). */
  @Patch(':id/verify-email')
  verifyEmail(@Param('id') id: string) {
    return this.adminUsersService.verifyEmail(id);
  }

  /** Édite nom/email d'un compte quelconque (§14) — voir AdminUsersService.updateProfile. */
  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.adminUsersService.updateProfile(id, dto, actingUser);
  }

  /** Avatar emoji/préréglage d'un compte quelconque. */
  @Patch(':id/avatar')
  updateAvatar(
    @Param('id') id: string,
    @Body() dto: UpdateAvatarDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.adminUsersService.updateAvatar(id, dto.avatar, actingUser);
  }

  /** Upload d'une photo de profil pour un compte quelconque, sans le quota de l'auto-upload. */
  @Post(':id/avatar/upload')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_AVATAR_SIZE } }))
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier envoyé.');
    return this.adminUsersService.uploadAvatar(id, file, actingUser);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.adminUsersService.updateRole(id, dto.role, actingUser);
  }

  @Patch(':id/suspend')
  @Roles('MODERATOR', 'ADMIN', 'SUPER_ADMIN')
  suspend(@Param('id') id: string, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.adminUsersService.suspend(id, actingUser);
  }

  @Patch(':id/unsuspend')
  @Roles('MODERATOR', 'ADMIN', 'SUPER_ADMIN')
  unsuspend(@Param('id') id: string) {
    return this.adminUsersService.unsuspend(id);
  }

  @Patch(':id/ban')
  ban(@Param('id') id: string, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.adminUsersService.ban(id, actingUser);
  }

  @Patch(':id/unban')
  unban(@Param('id') id: string) {
    return this.adminUsersService.unban(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.adminUsersService.remove(id, actingUser);
  }
}
