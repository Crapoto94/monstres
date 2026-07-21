import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportType } from '../../generated/prisma/enums';

export class CreateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
