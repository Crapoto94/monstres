import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminListWhatsAppLogQueryDto {
  /** Recherche partielle sur le destinataire ou le message. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['SENT', 'FAILED', 'SKIPPED'])
  status?: 'SENT' | 'FAILED' | 'SKIPPED';

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
