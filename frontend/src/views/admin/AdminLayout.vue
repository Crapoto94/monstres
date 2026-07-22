<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fetchDashboardStats, type DashboardStats } from '@/services/admin'

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
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Administration</h1>

    <nav class="mt-3 flex gap-1 overflow-x-auto text-sm">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5"
        :class="
          (tab.exact ? $route.path === tab.to : $route.path.startsWith(tab.to))
            ? 'bg-violet-600 text-white'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
        "
      >
        {{ tab.label }}
        <span
          v-if="tab.badge !== null && tab.badge !== undefined"
          class="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
          :class="
            (tab.exact ? $route.path === tab.to : $route.path.startsWith(tab.to))
              ? 'bg-white/20 text-white'
              : tab.badge > 0 && tab.label === 'Signalements'
                ? 'bg-red-500 text-white'
                : 'bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-200'
          "
        >
          {{ tab.badge }}
        </span>
      </RouterLink>
    </nav>

    <div class="mt-4">
      <RouterView />
    </div>
  </section>
</template>
