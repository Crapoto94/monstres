import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Les Monstres',
        short_name: 'Monstres',
        description:
          'Repérer, partager et récupérer les objets encombrants abandonnés dans la rue.',
        theme_color: '#16171d',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // TODO Phase 2/branding : remplacer par de vraies icônes PNG (192/512, maskable).
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
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
