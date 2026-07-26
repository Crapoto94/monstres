import type { Request } from 'express';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/** Extrait l'IP réelle du visiteur derrière le reverse-proxy nginx (voir nginx.conf, X-Forwarded-For). */
export function getClientIp(request: Request | undefined): string | null {
  return (
    (request?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    request?.socket?.remoteAddress ??
    null
  );
}

/** Reconnaissance simple par sous-chaînes — suffisant pour des statistiques, pas une empreinte précise. */
export function parseUserAgent(ua: string | undefined): { os: string; browser: string; deviceType: DeviceType } {
  if (!ua) return { os: 'Inconnu', browser: 'Inconnu', deviceType: 'desktop' };

  // iPhone/iPad AVANT "Mac OS" : une UA iOS contient toujours la sous-chaîne
  // "like Mac OS X", donc l'ordre inverse classait tous les iPhone en macOS.
  let os = 'Autre';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = 'Autre';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && ua.includes('Version/')) browser = 'Safari';

  let deviceType: DeviceType = 'desktop';
  if (ua.includes('iPad') || (ua.includes('Android') && !ua.includes('Mobile'))) deviceType = 'tablet';
  else if (ua.includes('Mobi') || ua.includes('iPhone')) deviceType = 'mobile';

  return { os, browser, deviceType };
}
