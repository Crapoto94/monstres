import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  private readonly logger = new Logger(FacebookAuthGuard.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('FACEBOOK_CLIENT_ID') || !this.config.get<string>('FACEBOOK_CLIENT_SECRET')) {
      const res = context.switchToHttp().getResponse<Response>();
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
      res.redirect(`${frontendUrl}/connexion?error=facebook_unavailable`);
      return false;
    }
    return this.tryActivate(context);
  }

  /** Voir GoogleAuthGuard.tryActivate() — même correctif, même défaut d'origine. */
  private async tryActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      this.logger.error("Échec de l'authentification Facebook", error as Error);
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
