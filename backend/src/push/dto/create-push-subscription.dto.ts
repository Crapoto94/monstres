import { IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushSubscriptionKeysDto {
  @IsString()
  p256dh: string;

  @IsString()
  auth: string;
}

/** Reflète la forme native de `PushSubscription.toJSON()` côté navigateur. */
export class CreatePushSubscriptionDto {
  @IsUrl({ require_tld: false })
  endpoint: string;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}
