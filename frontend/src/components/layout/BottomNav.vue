<script setup lang="ts">
const links = [
  { to: '/', label: 'Accueil' },
  { to: '/carte', label: 'Carte' },
  { to: '/ajouter', label: 'Ajouter' },
  { to: '/alertes', label: 'Alertes' },
  { to: '/profil', label: 'Profil' },
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
      class="flex-1 py-3 text-center text-xs text-gray-500 dark:text-gray-400"
      active-class="text-violet-600 dark:text-violet-400 font-medium"
    >
      {{ link.label }}
    </RouterLink>
  </nav>
</template>
