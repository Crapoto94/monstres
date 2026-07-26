import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('summary')
  getSummary(@Query() query: AdminAnalyticsQueryDto) {
    return this.adminAnalyticsService.getSummary(query.days ?? 30);
  }
}
