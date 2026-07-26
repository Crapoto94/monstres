import { api } from './api'

/**
 * Balise de consultation (§ KPI admin) : fire-and-forget, jamais bloquante
 * pour la navigation. Le backend anonymise tout (voir AnalyticsService) —
 * on n'envoie ici que le chemin visité et, le cas échéant, l'identifiant du
 * Monstre consulté.
 */
export function sendPageView(path: string, itemId?: string): void {
  api.post('/analytics/pageview', { path, itemId }).catch(() => {
    // Une statistique manquée ne doit jamais perturber l'utilisateur.
  })
}
