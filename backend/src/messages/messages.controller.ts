import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { MessagesService } from './messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  findMyConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.findMyConversations(user.id);
  }

  @Post('conversations')
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.findOrCreateConversation(
      user.id,
      dto.recipientId,
    );
  }

  @Get('conversations/:conversationId/messages')
  findMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.findMessages(conversationId, user.id);
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.sendMessage(
      conversationId,
      user.id,
      dto.content,
    );
  }

  @Patch('conversations/:conversationId/read')
  markAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.markAsRead(conversationId, user.id);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.getUnreadCount(user.id);
  }

  @Get('support-recipient')
  findSupportRecipient(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.findSupportRecipient(user.id);
  }
}
