import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminWhatsAppLogService } from './admin-whatsapp-log.service';
import { AdminListWhatsAppLogQueryDto } from './dto/admin-list-whatsapp-log-query.dto';

/** Journal des messages WhatsApp envoyés (ou tentés) via WhatsAppService, réservé SUPER_ADMIN. */
@Controller('admin/whatsapp-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminWhatsAppLogController {
  constructor(private readonly adminWhatsAppLogService: AdminWhatsAppLogService) {}

  @Get()
  findAll(@Query() query: AdminListWhatsAppLogQueryDto) {
    return this.adminWhatsAppLogService.findMany(query);
  }
}
