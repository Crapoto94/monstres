import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
