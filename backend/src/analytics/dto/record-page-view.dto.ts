import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordPageViewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  path!: string;

  @IsOptional()
  @IsString()
  itemId?: string;
}
