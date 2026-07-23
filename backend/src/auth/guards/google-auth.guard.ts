import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('GOOGLE_CLIENT_ID') || !this.config.get<string>('GOOGLE_CLIENT_SECRET')) {
      const res = context.switchToHttp().getResponse<Response>();
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
      res.redirect(`${frontendUrl}/connexion?error=google_unavailable`);
      return false;
    }
    return this.tryActivate(context);
  }

  /**
   * `super.canActivate()` effectue l'échange OAuth réel (token, profil) sur
   * la route de callback — s'il échoue côté Google (ou dans `validate()`),
   * la promesse rejette et remontait auparavant en erreur non gérée
   * (JSON brut "INTERNAL_ERROR" affiché au visiteur au lieu d'une
   * redirection propre — observé sur mobile, pas sur desktop, cause
   * probablement liée au flux Google spécifique au mobile). On capture et
   * redirige comme pour toute autre erreur OAuth, en loggant la cause
   * réelle côté serveur pour pouvoir diagnostiquer si ça se reproduit.
   */
  private async tryActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      this.logger.error("Échec de l'authentification Google", error as Error);
      const res = context.switchToHttp().getResponse<Response>();
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
      res.redirect(`${frontendUrl}/connexion?error=oauth_failed`);
      return false;
    }
  }

  /** Fait transiter le paramètre `redirect` via `state` jusqu'au callback. */
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : '/profil';
    return { state: redirect };
  }
}
