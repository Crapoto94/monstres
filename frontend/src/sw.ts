/// <reference lib="webworker" />
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

const manifestEntries = self.__WB_MANIFEST
precacheAndRoute(manifestEntries)

// Fallback SPA (sert index.html pour toute navigation, pour l'usage hors
// ligne) — sauf sur /api/, sinon le service worker sert le shell SPA en
// cache au lieu de laisser les redirections OAuth du backend (ex.
// /api/v1/auth/facebook/callback) atteindre le vrai endpoint : plus de
// cookie de session posé, page blanche après connexion Google/Facebook.
// Manifeste vide en dev (`vite dev`, injectManifest ne tourne qu'au build)
// — createHandlerBoundToURL exige que l'URL soit précachée, donc on saute
// ce fallback en dev (le serveur Vite gère déjà le fallback SPA lui-même).
if (manifestEntries.length > 0) {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }))
}

// Notifications push (opt-in explicite, voir ProfileView + src/push.ts).
// Reçu même app/onglet fermé tant que le navigateur tourne (ou, sur
// iOS/PWA installée, même navigateur fermé) — c'est tout l'intérêt du
// service worker par rapport à une notification déclenchée depuis l'app.
self.addEventListener('push', (event) => {
  if (!event.data) return
  const payload = event.data.json() as { title: string; body: string; url: string }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: payload.url },
    }),
  )
})

// Ouvre (ou refocus) un onglet existant sur l'URL ciblée plutôt que d'en
// systématiquement ouvrir un nouveau.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
