import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Le message ne peut pas être vide.' })
  @MaxLength(2000, {
    message: 'Le message est trop long (2000 caractères maximum).',
  })
  content: string;
}
