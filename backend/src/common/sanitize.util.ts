const SENSITIVE_KEY_PATTERN = /password|token|secret|apikey/i;

/**
 * Retire récursivement les valeurs sensibles (mots de passe, tokens...)
 * d'un objet avant de le stocker dans un log (AuditLog, etc.).
 */
export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[masqué]' : sanitizeForLog(val),
      ]),
    );
  }
  return value;
}
