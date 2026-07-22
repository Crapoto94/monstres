<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { fetchDashboardStats, type DashboardStats } from '@/services/admin'

const route = useRoute()

const auth = useAuthStore()
const stats = ref<DashboardStats | null>(null)

onMounted(async () => {
  try {
    stats.value = await fetchDashboardStats()
  } catch {
    // Silently fail — stats are optional badges
  }
})

const tabs = computed(() => [
  ...(auth.isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', exact: true, badge: null as number | null },
        { to: '/admin/utilisateurs', label: 'Utilisateurs', badge: stats.value?.users.total ?? null },
        { to: '/admin/monstres', label: 'Monstres', badge: stats.value?.items.available ?? null },
        { to: '/admin/categories', label: 'Catégories', badge: null },
        { to: '/admin/tutoriel', label: 'Tutoriel', badge: null },
        { to: '/admin/mails', label: 'Mails', badge: null },
        { to: '/admin/parametres', label: 'Paramètres', badge: null },
      ]
    : []),
  { to: '/admin/signalements', label: 'Signalements', badge: stats.value?.pendingReports ?? null },
  ...(auth.user?.role === 'SUPER_ADMIN'
    ? [{ to: '/admin/sql', label: 'Console SQL', badge: null }]
    : []),
])

function isActive(tab: { to: string; exact?: boolean }) {
  return tab.exact ? route.path === tab.to : route.path.startsWith(tab.to)
}
</script>

<template>
  <div class="flex flex-1">
    <!-- Sidebar desktop (lg+) -->
    <aside class="hidden lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:dark:border-gray-800 lg:dark:bg-gray-900">
      <div class="flex items-center gap-2 px-4 py-4">
        <RouterLink to="/" class="text-xl font-bold text-violet-600 dark:text-violet-400">👹</RouterLink>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Administration</h2>
      </div>
      <nav class="flex flex-1 flex-col gap-1 px-2 pb-4">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
          :class="isActive(tab)
            ? 'bg-violet-100 font-semibold text-violet-700 dark:bg-violet-900 dark:text-violet-300'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
        >
          <span class="flex-1">{{ tab.label }}</span>
          <span
            v-if="tab.badge !== null && tab.badge !== undefined"
            class="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
            :class="isActive(tab)
              ? 'bg-violet-200 text-violet-800 dark:bg-violet-800 dark:text-violet-200'
              : tab.badge > 0 && tab.label === 'Signalements'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
          >
            {{ tab.badge }}
          </span>
        </RouterLink>
      </nav>
      <div class="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <RouterLink to="/profil" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Retour au profil</RouterLink>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex flex-1 flex-col">
      <section class="flex-1 p-4">
        <!-- Header mobile -->
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 lg:hidden">Administration</h1>

        <!-- Tabs mobile (scrollable) -->
        <nav class="mt-3 flex gap-1 overflow-x-auto text-sm lg:hidden">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            class="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5"
            :class="isActive(tab)
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
          >
            {{ tab.label }}
            <span
              v-if="tab.badge !== null && tab.badge !== undefined"
              class="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
              :class="isActive(tab)
                ? 'bg-white/20 text-white'
                : tab.badge > 0 && tab.label === 'Signalements'
                  ? 'bg-red-500 text-white'
                  : 'bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-200'"
            >
              {{ tab.badge }}
            </span>
          </RouterLink>
        </nav>

        <div class="mt-4">
          <RouterView />
        </div>
      </section>
    </div>
  </div>
</template>
