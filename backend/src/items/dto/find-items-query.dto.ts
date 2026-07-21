import { Type } from 'class-transformer';
import { IsInt, IsLatitude, IsLongitude, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

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
}
