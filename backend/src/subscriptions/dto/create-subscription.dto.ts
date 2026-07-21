import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  /** Rayon en mètres — plafonné par `max_subscription_radius` (settings). */
  @Type(() => Number)
  @IsPositive()
  radius: number;
}
