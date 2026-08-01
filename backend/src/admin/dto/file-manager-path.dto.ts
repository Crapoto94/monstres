import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FileManagerPathDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;
}
