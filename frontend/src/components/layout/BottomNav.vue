<script setup lang="ts">
const links = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/carte', label: 'Carte', icon: '🗺️' },
  { to: '/ajouter', label: 'Ajouter', icon: '➕' },
  { to: '/alertes', label: 'Alertes', icon: '🔔' },
  { to: '/profil', label: 'Profil', icon: '👤' },
]
</script>

<template>
  <nav
    class="sticky bottom-0 flex border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
  >
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="flex flex-1 flex-col items-center gap-0.5 py-3 text-center text-xs text-gray-500 dark:text-gray-400"
      active-class="text-violet-600 dark:text-violet-400 font-medium"
    >
      <span class="text-lg leading-none">{{ link.icon }}</span>
      <span>{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>
