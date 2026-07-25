import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Champs reçus en multipart depuis la routine d'import (les valeurs
 * numériques arrivent en chaîne, coercées via class-transformer). La photo
 * elle-même est reçue à part (FileInterceptor), pas dans ce DTO.
 */
export class CreateFacebookImportDto {
  /** Identifiant du post Facebook (clé anti-doublon). */
  @IsString()
  @IsNotEmpty()
  postId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Adresse en clair extraite du post ; géocodée côté serveur si lat/lng absents. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
