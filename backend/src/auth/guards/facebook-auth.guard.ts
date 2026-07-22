import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
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
    return super.canActivate(context) as Promise<boolean>;
  }

  /** Fait transiter le paramètre `redirect` via `state` jusqu'au callback. */
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : '/profil';
    return { state: redirect };
  }
}
