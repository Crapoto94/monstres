import { ConfigService } from '@nestjs/config';

export function getCookieName(config: ConfigService): string {
  return config.get<string>('JWT_COOKIE_NAME', 'access_token');
}

/**
 * Options du cookie de session JWT. Utilisées à la fois pour le poser
 * (`res.cookie`) et pour l'effacer (`res.clearCookie`) — le navigateur
 * n'efface un cookie que si `domain`/`path`/`secure`/`sameSite`
 * correspondent exactement à ceux utilisés pour le poser, d'où l'intérêt
 * d'une source unique partagée entre les deux usages.
 *
 * `domain` est volontairement laissé à `undefined` (cookie "host-only")
 * dès que `JWT_COOKIE_DOMAIN` est absent/vide/`localhost` — un cookie posé
 * avec un `domain` explicite (ex. `monstres.fbc.fr`) n'est jamais envoyé
 * pour un autre domaine (ex. `monstres.app`) pointant sur le même serveur,
 * même si l'app tourne à l'identique dessus. Ne renseigner cette variable
 * que si un vrai partage de session inter-sous-domaines est nécessaire.
 */
export function getCookieOptions(config: ConfigService) {
  const secure = config.get<string>('JWT_COOKIE_SECURE', 'false') === 'true';
  const domain = config.get<string>('JWT_COOKIE_DOMAIN');
  return {
    httpOnly: true,
    secure,
    sameSite: config.get<string>('JWT_COOKIE_SAME_SITE', 'lax') as 'lax' | 'strict' | 'none',
    domain: !domain || domain === 'localhost' ? undefined : domain,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
