import { onUnmounted, watchEffect, type MaybeRefOrGetter, toValue } from 'vue'

const SITE_NAME = "Les monstres - L'appli"
const SITE_URL = 'https://monstres.app'

/** Valeurs de repli : celles écrites en dur dans index.html (accueil). */
const DEFAULT_TITLE = "Les Monstres — l'appli des encombrants à récupérer près de chez toi"
const DEFAULT_DESCRIPTION =
  "Les Monstres, c'est l'autre nom des encombrants : meubles, électroménager, livres, jouets abandonnés dans la rue. Repère-les près de chez toi et récupère-les gratuitement, pour leur donner une seconde vie."

export interface SeoOptions {
  /** Titre de la page, sans le nom du site (ajouté automatiquement). */
  title?: MaybeRefOrGetter<string | undefined>
  description?: MaybeRefOrGetter<string | undefined>
  /** Chemin canonique (ex. `/carte`). Par défaut, celui de l'URL courante. */
  path?: MaybeRefOrGetter<string | undefined>
  /** URL absolue d'une image de partage. */
  image?: MaybeRefOrGetter<string | undefined>
  /** Empêche l'indexation (pages privées, contenu non public). */
  noindex?: MaybeRefOrGetter<boolean | undefined>
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Renseigne titre, description, URL canonique et balises Open Graph de la
 * page courante. Nécessaire parce que l'application est une SPA : sans ça,
 * toutes les pages partagent le titre et la description d'`index.html`, et
 * Google n'a aucun moyen de les distinguer les unes des autres.
 *
 * Les valeurs sont réactives : passer un `ref`/getter pour une page dont le
 * contenu arrive après un appel réseau (fiche Monstre, par exemple).
 */
export function useSeo(options: SeoOptions): void {
  watchEffect(() => {
    const rawTitle = toValue(options.title)
    const description = toValue(options.description) ?? DEFAULT_DESCRIPTION
    const path = toValue(options.path) ?? window.location.pathname
    const image = toValue(options.image) ?? `${SITE_URL}/pwa-512.png`
    const noindex = toValue(options.noindex) ?? false

    const title = rawTitle ? `${rawTitle} | ${SITE_NAME}` : DEFAULT_TITLE
    const canonical = `${SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`

    document.title = title
    upsertMeta('meta[name="description"]', 'name', 'description', description)
    upsertCanonical(canonical)

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', image)

    // Pages privées : présentes dans robots.txt, mais la balise reste la
    // garantie de dernier recours si une URL est découverte autrement.
    const robotsEl = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (noindex) {
      upsertMeta('meta[name="robots"]', 'name', 'robots', 'noindex, follow')
    } else if (robotsEl) {
      robotsEl.remove()
    }
  })

  // Une page qui se démonte ne doit pas laisser son `noindex` à la suivante.
  onUnmounted(() => {
    document.head.querySelector('meta[name="robots"]')?.remove()
  })
}
