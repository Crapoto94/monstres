import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminListAuditQueryDto {
  /** Filtre exact sur l'auteur de l'action. */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Recherche partielle sur le nom de l'action (ex : "ItemsController"). */
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
