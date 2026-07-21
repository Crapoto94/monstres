import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('items/:itemId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findAll(@Param('itemId') itemId: string) {
    return this.commentsService.findByItem(itemId);
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

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  remove(@Param('commentId') commentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.remove(commentId, user);
  }
}
