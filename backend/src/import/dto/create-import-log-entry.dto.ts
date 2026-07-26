import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const DECISIONS = ['run', 'imported', 'duplicate', 'skipped_found', 'skipped_error', 'skipped_other'] as const;
export type ImportLogDecision = (typeof DECISIONS)[number];

/**
 * Une ligne par annonce examinée par la routine, ou une ligne "run" quand le
 * cycle n'a rien trouvé de neuf (pour que le passage lui-même reste visible
 * dans le journal même sans import). `runId` regroupe toutes les lignes
 * d'un même passage (généré par la routine elle-même, ex. horodatage ISO).
 */
export class CreateImportLogEntryDto {
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @IsIn(DECISIONS)
  decision!: ImportLogDecision;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  postId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  itemId?: string;
}
