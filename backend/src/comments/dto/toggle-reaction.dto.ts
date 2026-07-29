import { IsString, IsIn } from 'class-validator';

const REACTION_TYPES = ['LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY'];

export class ToggleReactionDto {
  @IsString()
  @IsIn(REACTION_TYPES, { message: 'Type de réaction invalide' })
  type: string;
}
