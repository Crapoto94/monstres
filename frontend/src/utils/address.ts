export interface NominatimAddress {
  house_number?: string
  road?: string
  pedestrian?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  suburb?: string
  hamlet?: string
}

/**
 * Nominatim renvoie une adresse complète (numéro, rue, ville, arrondissement,
 * département, région, pays, code postal…) via `display_name` — bien trop
 * verbeux pour l'UI. On reconstruit une adresse courte ("12 rue Piard,
 * Limeil-Brévannes") à partir des champs structurés (`addressdetails=1`)
 * plutôt que de découper `display_name` par virgules, plus fiable (l'ordre
 * et le nombre de segments varient selon la zone).
 * Le numéro de rue peut être absent si OpenStreetMap ne l'a pas mappé à cet
 * endroit précis (donnée manquante en amont, rien à corriger côté appli).
 */
export function formatShortAddress(address: NominatimAddress | undefined, fallback: string): string {
  if (!address) return fallback
  const street = [address.house_number, address.road ?? address.pedestrian].filter(Boolean).join(' ')
  const locality =
    address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? address.hamlet
  const parts = [street, locality].filter(Boolean)
  return parts.length ? parts.join(', ') : fallback
}
