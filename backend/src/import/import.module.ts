import { Module } from '@nestjs/common';
import { ImageModule } from '../images/image.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [ImageModule, SubscriptionsModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
