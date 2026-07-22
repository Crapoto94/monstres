import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [ConfigModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
