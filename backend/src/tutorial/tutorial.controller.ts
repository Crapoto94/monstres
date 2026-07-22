import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TutorialService } from './tutorial.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@Controller('tutorial')
export class TutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  @Get()
  findActivePages() {
    return this.tutorialService.findActivePages();
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  complete(@CurrentUser() user: AuthenticatedUser) {
    return this.tutorialService.completeOnboarding(user.id);
  }
}
