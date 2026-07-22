import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Sans ceci, le service worker intercepte TOUTES les navigations
        // (mode "navigate") de l'origine, y compris les redirections OAuth
        // du backend (ex. /api/v1/auth/facebook/callback) — il leur sert le
        // shell SPA en cache au lieu de les laisser atteindre le vrai
        // endpoint backend, qui ne pose alors jamais le cookie de session
        // ni ne redirige : page blanche après connexion Facebook/Google.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Les Monstres',
        short_name: 'Monstres',
        description:
          'Repérer, partager et récupérer les objets encombrants abandonnés dans la rue.',
        theme_color: '#2a7877',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
