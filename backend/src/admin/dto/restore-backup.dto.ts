import { IsString, Matches } from 'class-validator';

export class RestoreBackupDto {
  @IsString()
  @Matches(/^[^/\\]+\.db$/, {
    message: 'Nom de sauvegarde invalide.',
  })
  name: string;
}
