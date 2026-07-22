/**
 * Résout la valeur brute stockée en base vers ce que le frontend doit
 * afficher : un emoji reste tel quel, une URL absolue (avatar Google/
 * Facebook) reste telle quelle, un chemin relatif d'upload local
 * (`avatars/{userId}/{fichier}`, cf. `ImageService.processAvatar`) est
 * préfixé par `imgBaseUrl`.
 */
export function resolveAvatarUrl(avatar: string | null, imgBaseUrl: string): string | null {
  if (!avatar) return null;
  if (/^https?:\/\//.test(avatar)) return avatar;
  if (avatar.startsWith('avatars/')) return `${imgBaseUrl}/${avatar}`;
  return avatar;
}
