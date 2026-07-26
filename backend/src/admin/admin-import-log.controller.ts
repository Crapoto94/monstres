import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminImportLogService } from './admin-import-log.service';
import { AdminListImportLogQueryDto } from './dto/admin-list-import-log-query.dto';

/** Journal des passages de la routine d'import (Facebook → Monstres). */
@Controller('admin/import-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminImportLogController {
  constructor(private readonly adminImportLogService: AdminImportLogService) {}

  @Get('runs')
  findRuns(@Query() query: AdminListImportLogQueryDto) {
    return this.adminImportLogService.findRuns(query);
  }
}
