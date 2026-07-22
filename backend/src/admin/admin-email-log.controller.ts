import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminEmailLogService } from './admin-email-log.service';
import { AdminListEmailLogQueryDto } from './dto/admin-list-email-log-query.dto';

/** Journal des emails envoyés (ou tentés) via EmailService, réservé SUPER_ADMIN. */
@Controller('admin/email-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminEmailLogController {
  constructor(private readonly adminEmailLogService: AdminEmailLogService) {}

  @Get()
  findAll(@Query() query: AdminListEmailLogQueryDto) {
    return this.adminEmailLogService.findMany(query);
  }
}
