import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AnalyticsService } from './analytics.service';
import { RecordPageViewDto } from './dto/record-page-view.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('pageview')
  @UseGuards(OptionalJwtAuthGuard)
  async record(
    @Body() dto: RecordPageViewDto,
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<{ recorded: true }> {
    await this.analyticsService.record(dto, request, user?.id ?? null);
    return { recorded: true };
  }
}
