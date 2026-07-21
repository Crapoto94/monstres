import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminReportsService } from './admin-reports.service';
import { ResolveReportDto } from './dto/resolve-report.dto';

/**
 * §6.5/§14 : file de modération, réservée MODERATOR/ADMIN/SUPER_ADMIN
 * (contrairement aux autres contrôleurs admin/*, réservés ADMIN/SUPER_ADMIN —
 * §5 confie explicitement le traitement des signalements au Modérateur).
 */
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MODERATOR', 'ADMIN', 'SUPER_ADMIN')
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get()
  findQueue(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.adminReportsService.findQueue(
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @Post(':itemId/resolve')
  resolve(@Param('itemId') itemId: string, @Body() dto: ResolveReportDto) {
    return this.adminReportsService.resolve(itemId, dto.decision);
  }
}
