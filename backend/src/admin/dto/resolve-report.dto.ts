import { IsIn } from 'class-validator';

export type ReportDecision = 'KEEP' | 'HIDE' | 'DELETE';

export class ResolveReportDto {
  @IsIn(['KEEP', 'HIDE', 'DELETE'])
  decision: ReportDecision;
}
