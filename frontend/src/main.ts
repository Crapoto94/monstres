import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { fetchPublicSettings } from './services/settings'
import { fetchHealthVersion } from './services/health'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

/**
 * Rechargement forcé si le bundle affiché est obsolète. Sur smartphone,
 * un simple rafraîchissement peut continuer à servir l'ancien shell mis en
 * cache par le service worker — surtout quand l'appli est installée et
 * reprise depuis l'arrière-plan sans jamais recharger la page. On compare
 * donc la version compilée du frontend (`__APP_VERSION__`) à celle exposée
 * par le backend (`GET /api/v1/health`, bumpée en même temps à chaque
 * déploiement) : si elles diffèrent, on force un rechargement.
 *
 * Garde anti-boucle : on n'essaie pas plus d'une fois toutes les 30 s, au
 * cas où le premier rechargement serait encore servi par l'ancien service
 * worker (cache obsolette) — on retentera au prochain affichage. La clé est
 * effacée dès que les versions correspondent à nouveau.
 */
const FORCED_RELOAD_KEY = 'lm_forced_reload_at'

function forceReloadIfOutdated() {
  const lastForcedAt = Number(sessionStorage.getItem(FORCED_RELOAD_KEY) ?? 0)
  if (Date.now() - lastForcedAt < 30_000) return

  fetchHealthVersion()
    .then((remoteVersion) => {
      if (remoteVersion && remoteVersion !== __APP_VERSION__) {
        sessionStorage.setItem(FORCED_RELOAD_KEY, String(Date.now()))
        window.location.reload()
      } else {
        sessionStorage.removeItem(FORCED_RELOAD_KEY)
      }
    })
    .catch(() => {
      // Backend injoignable (offline, panne) : ne pas bloquer, on réessaiera.
    })
}

forceReloadIfOutdated()
// Restauration depuis le bfcache (ex. retour arrière) : main.ts n'est pas
// ré-exécuté, on relance la vérification via l'événement `pageshow`.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) forceReloadIfOutdated()
})

/**
 * Réglage `pwa_enabled` (admin → Paramètres) : coupe-circuit pour le
 * développement/débogage, où le cache du service worker gêne plus qu'il
 * n'aide (rechargements qui ne reflètent pas les derniers changements).
 * Si désactivé, on désenregistre tout SW déjà actif + vide ses caches
 * pour débloquer immédiatement un appareil resté sur une ancienne version.
 */
fetchPublicSettings()
  .then(({ pwaEnabled }) => {
    if (!pwaEnabled) {
      return Promise.all([
        navigator.serviceWorker?.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister()))),
        'caches' in window ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : null,
      ])
    }

    /**
     * Sans ceci, un onglet déjà ouvert (ou une PWA installée jamais fermée)
     * peut rester bloqué sur un ancien bundle mis en cache indéfiniment après
     * un déploiement — le service worker se met à jour en tâche de fond mais
     * ne prend jamais la main tant que la page n'est pas rechargée. `updateSW`
     * force l'activation immédiate + rechargement dès qu'une nouvelle version
     * est détectée.
     */
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true)
      },
    })
    return undefined
  })
  .catch(() => {
    // Backend injoignable au boot (offline, panne) : ne pas bloquer l'app,
    // simplement ne pas (dés)activer le service worker cette fois-ci.
  })
