import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminAuditService } from './admin-audit.service';
import { AdminListAuditQueryDto } from './dto/admin-list-audit-query.dto';

/** Journal global des actions de l'appli (qui, quoi, quand), réservé SUPER_ADMIN. */
@Controller('admin/audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get()
  findAll(@Query() query: AdminListAuditQueryDto) {
    return this.adminAuditService.findMany(query);
  }
}
