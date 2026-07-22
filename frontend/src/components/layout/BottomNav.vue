<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const links = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/carte', label: 'Carte', icon: 'map' },
  { to: '/alertes', label: 'Alertes', icon: 'bell' },
  { to: '/profil', label: 'Profil', icon: 'user' },
]

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav
    class="sticky bottom-0 flex items-center border-t border-gray-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/95"
  >
    <RouterLink
      :to="links[0].to"
      class="flex flex-1 flex-col items-center gap-1 py-2.5 text-center text-[11px] text-gray-400 transition-colors dark:text-gray-500"
      :class="isActive(links[0].to) ? 'text-brand-600 font-semibold dark:text-brand-300' : ''"
    >
      <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6">
        <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ links[0].label }}</span>
    </RouterLink>

    <RouterLink
      :to="links[1].to"
      class="flex flex-1 flex-col items-center gap-1 py-2.5 text-center text-[11px] text-gray-400 transition-colors dark:text-gray-500"
      :class="isActive(links[1].to) ? 'text-brand-600 font-semibold dark:text-brand-300' : ''"
    >
      <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
        <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.8" />
      </svg>
      <span>{{ links[1].label }}</span>
    </RouterLink>

    <RouterLink
      to="/ajouter"
      class="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-center text-[11px] text-gray-400 dark:text-gray-500"
    >
      <span
        class="absolute -top-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white transition-transform active:scale-95 dark:ring-gray-950"
      >
        <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        </svg>
      </span>
      <span class="mt-7 font-medium text-brand-700 dark:text-brand-300">Ajouter</span>
    </RouterLink>

    <RouterLink
      :to="links[2].to"
      class="flex flex-1 flex-col items-center gap-1 py-2.5 text-center text-[11px] text-gray-400 transition-colors dark:text-gray-500"
      :class="isActive(links[2].to) ? 'text-brand-600 font-semibold dark:text-brand-300' : ''"
    >
      <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6">
        <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
        <path d="M10 19.5a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span>{{ links[2].label }}</span>
    </RouterLink>

    <RouterLink
      :to="links[3].to"
      class="flex flex-1 flex-col items-center gap-1 py-2.5 text-center text-[11px] text-gray-400 transition-colors dark:text-gray-500"
      :class="isActive(links[3].to) ? 'text-brand-600 font-semibold dark:text-brand-300' : ''"
    >
      <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6">
        <circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8" />
        <path d="M4.5 20c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span>{{ links[3].label }}</span>
    </RouterLink>
  </nav>
</template>
