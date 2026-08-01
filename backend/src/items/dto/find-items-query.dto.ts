import { Type } from 'class-transformer';
import { IsDate, IsInt, IsLatitude, IsLongitude, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class FindItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  /** Rayon de recherche en km, seulement pris en compte si lat/lng fournis. */
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  radius?: number;

  /** Filtre temporel : ne remonte que les Monstres publiés après cette date (ISO 8601). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  since?: Date;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @IsOptional()
  @IsString()
  sort?: 'recent' | 'nearby';
}
