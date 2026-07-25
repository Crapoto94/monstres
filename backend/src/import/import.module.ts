import { Module } from '@nestjs/common';
import { ImageModule } from '../images/image.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [ImageModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
