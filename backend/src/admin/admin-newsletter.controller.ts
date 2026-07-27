import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminNewsletterService } from './admin-newsletter.service';
import { SendNewsletterDto } from './dto/send-newsletter.dto';

@Controller('admin/newsletter')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminNewsletterController {
  constructor(private readonly newsletterService: AdminNewsletterService) {}

  @Get('status')
  getStatus() {
    return this.newsletterService.getStatus();
  }

  @Get('history')
  getHistory() {
    return this.newsletterService.getHistory();
  }

  @Post('send')
  send(@Body() dto: SendNewsletterDto) {
    return this.newsletterService.send(dto);
  }
}
