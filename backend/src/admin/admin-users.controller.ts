import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';

/**
 * Espace admin (préfixe séparé du reste, préfigure la Phase 9). Réservé
 * ADMIN/SUPER_ADMIN — voir §5 du cahier des charges pour les rôles.
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /** Valide manuellement l'email d'un compte en attente (email jamais reçu, etc.). */
  @Patch(':id/verify-email')
  verifyEmail(@Param('id') id: string) {
    return this.adminUsersService.verifyEmail(id);
  }
}
