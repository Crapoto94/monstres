import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

/** Pagination simple : les archives n'ont pas de classement (pas d'interaction, §archivage). */
export class FindArchivedQueryDto {
  /** Filtre temporel : ne remonte que les Monstres archivés dont la publication est postérieure à cette date (ISO 8601). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  since?: Date;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
