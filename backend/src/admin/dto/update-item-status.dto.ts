import { IsEnum } from 'class-validator';
import { ItemStatus } from '../../generated/prisma/enums';

export class UpdateItemStatusDto {
  @IsEnum(ItemStatus)
  status: ItemStatus;
}
