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
 */
export function getCookieOptions(config: ConfigService) {
  const secure = config.get<string>('JWT_COOKIE_SECURE', 'false') === 'true';
  const domain = config.get<string>('JWT_COOKIE_DOMAIN');
  return {
    httpOnly: true,
    secure,
    sameSite: config.get<string>('JWT_COOKIE_SAME_SITE', 'lax') as 'lax' | 'strict' | 'none',
    domain: domain === 'localhost' ? undefined : domain,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
