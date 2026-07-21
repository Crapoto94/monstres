import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { VotesService } from './votes.service';

@Controller('items')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post(':id/vote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  toggle(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.votesService.toggle(id, user);
  }
}
