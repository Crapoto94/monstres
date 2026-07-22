<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const tabs = computed(() => [
  ...(auth.isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', exact: true },
        { to: '/admin/utilisateurs', label: 'Utilisateurs' },
        { to: '/admin/monstres', label: 'Monstres' },
        { to: '/admin/categories', label: 'Catégories' },
        { to: '/admin/parametres', label: 'Paramètres' },
      ]
    : []),
  { to: '/admin/signalements', label: 'Signalements' },
  ...(auth.user?.role === 'SUPER_ADMIN'
    ? [{ to: '/admin/sql', label: 'Console SQL' }]
    : []),
])
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Administration</h1>

    <nav class="mt-3 flex gap-1 overflow-x-auto text-sm">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex-shrink-0 rounded-lg px-3 py-1.5"
        :class="
          (tab.exact ? $route.path === tab.to : $route.path.startsWith(tab.to))
            ? 'bg-violet-600 text-white'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
        "
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <div class="mt-4">
      <RouterView />
    </div>
  </section>
</template>
