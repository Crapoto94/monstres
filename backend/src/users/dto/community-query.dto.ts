import { IsOptional, IsString } from 'class-validator';

export class CommunityQueryDto {
  /** Recherche par nom/pseudo (insensible à la casse). */
  @IsOptional()
  @IsString()
  search?: string;
}
