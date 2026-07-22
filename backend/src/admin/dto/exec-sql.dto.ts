import { IsString, MaxLength } from 'class-validator';

export class ExecSqlDto {
  @IsString()
  @MaxLength(2000)
  sql: string;
}
