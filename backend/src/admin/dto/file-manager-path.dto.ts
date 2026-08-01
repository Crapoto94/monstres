import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class FileManagerPathDto {
  @IsOptional()
  @IsIn(['media', 'uploads'])
  root?: 'media' | 'uploads' = 'media';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;
}
