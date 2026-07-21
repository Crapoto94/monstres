import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SettingType } from '../../generated/prisma/enums';

export class UpdateSettingDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsEnum(SettingType)
  type?: SettingType;
}
