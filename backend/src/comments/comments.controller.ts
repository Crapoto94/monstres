import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';

@Controller('items/:itemId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Param('itemId') itemId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.commentsService.findByItem(itemId, user?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('itemId') itemId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.create(itemId, user, dto.content);
  }

  @Post(':commentId/reactions')
  @UseGuards(JwtAuthGuard)
  toggleReaction(
    @Param('commentId') commentId: string,
    @Body() dto: ToggleReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.toggleReaction(commentId, dto.type, user);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  remove(@Param('commentId') commentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.remove(commentId, user);
  }
}
