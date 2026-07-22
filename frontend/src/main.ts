import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { fetchPublicSettings } from './services/settings'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

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
