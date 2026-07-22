import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

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
