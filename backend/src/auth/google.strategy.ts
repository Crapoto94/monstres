import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';

export interface OAuthProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string | null;
  name: string;
  avatar: string | null;
}

/**
 * §10/Phase 11 : connexion Google. Si `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
 * ne sont pas renseignées, on construit quand même la stratégie avec des
 * valeurs factices (sinon `passport-google-oauth20` lève une exception au
 * démarrage et bloque tout le backend) — `GoogleAuthGuard` empêche ensuite
 * réellement d'emprunter ce chemin tant que la config est absente.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL: `${config.get<string>('APP_URL', 'http://localhost:3000')}/api/v1/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const oauthProfile: OAuthProfile = {
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value ?? null,
    };
    done(null, oauthProfile);
  }
}
