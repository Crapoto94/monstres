import { IsBoolean, IsOptional, Matches, ValidateIf } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappNotifications?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.phoneNumber !== null)
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Numéro de téléphone invalide (format international requis, ex. +33612345678).',
  })
  phoneNumber?: string | null;
}
