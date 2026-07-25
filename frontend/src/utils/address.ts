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
 * Utilisé uniquement en secours de la BAN (voir plus bas) : la couverture
 * communautaire OSM des numéros de rue est nettement plus lacunaire.
 */
export function formatShortAddress(address: NominatimAddress | undefined, fallback: string): string {
  if (!address) return fallback
  const street = [address.house_number, address.road ?? address.pedestrian].filter(Boolean).join(' ')
  const locality =
    address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? address.hamlet
  const parts = [street, locality].filter(Boolean)
  return parts.length ? parts.join(', ') : fallback
}

export interface BanAddressProperties {
  label: string
  name?: string
  street?: string
  housenumber?: string
  city?: string
}

/**
 * BAN (Base Adresse Nationale, api-adresse.data.gouv.fr) : base d'adresses
 * officielle de l'État français, bien plus complète que le géocodage
 * communautaire OSM/Nominatim pour les numéros de rue en France — vérifié en
 * pratique : une adresse sans numéro via Nominatim en avait un via la BAN à
 * la même position. Gratuite, sans clé, adaptée puisque l'appli ne vise que
 * la France (déjà `countrycodes=fr` côté recherche).
 */
export function formatShortBanAddress(properties: BanAddressProperties): string {
  const street = properties.street ?? properties.name
  const streetPart = properties.housenumber ? `${properties.housenumber} ${street}` : street
  const parts = [streetPart, properties.city].filter(Boolean)
  return parts.length ? parts.join(', ') : properties.label
}
