import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendNewsletterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  htmlContent: string;
}
