import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  avatar: string | null;
}
