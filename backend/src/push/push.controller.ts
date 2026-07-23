import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /** Public : nécessaire au navigateur avant même que l'utilisateur ne soit forcément déjà chargé côté client. */
  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePushSubscriptionDto, @Req() req: Request) {
    return this.pushService.subscribe(user.id, dto, req.headers['user-agent']).then(() => ({ subscribed: true }));
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(@CurrentUser() user: AuthenticatedUser, @Query('endpoint') endpoint: string) {
    return this.pushService.unsubscribe(user.id, endpoint).then(() => ({ subscribed: false }));
  }
}
