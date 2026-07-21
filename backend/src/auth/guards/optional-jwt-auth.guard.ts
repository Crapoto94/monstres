import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../jwt.strategy';

/**
 * Comme JwtAuthGuard mais n'échoue jamais : `request.user` vaut `null` sans
 * cookie valide au lieu de renvoyer 401. Pour les endpoints dont le contenu
 * varie selon visiteur/connecté (ex. §9 : position approximative/exacte).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
