import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import type { OAuthProfile } from './google.strategy';

type VerifyCallback = (error: unknown, user?: OAuthProfile | false) => void;

/**
 * Phase 11 : connexion Facebook. Même précaution qu'avec Google — la
 * stratégie se construit avec des valeurs factices si la config est
 * absente, `FacebookAuthGuard` bloque le chemin réel.
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('FACEBOOK_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('FACEBOOK_CLIENT_SECRET') || 'not-configured',
      callbackURL: `${config.get<string>('APP_URL', 'http://localhost:3000')}/api/v1/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const oauthProfile: OAuthProfile = {
      provider: 'facebook',
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value ?? null,
    };
    done(null, oauthProfile);
  }
}
