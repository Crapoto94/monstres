<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchDashboardStats, type DashboardStats } from '@/services/admin'

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)

const emit = defineEmits<{ (e: 'stats-loaded', stats: DashboardStats): void }>()

onMounted(async () => {
  stats.value = await fetchDashboardStats()
  loading.value = false
  if (stats.value) emit('stats-loaded', stats.value)
})
</script>

<template>
  <div>
    <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <div v-else-if="stats" class="flex flex-col gap-4">
      <!-- Pastilles résumé -->
      <div class="flex flex-wrap gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-900 dark:text-violet-300">
          👤 {{ stats.users.total }} users
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          🛋️ {{ stats.items.available }} actifs
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          📦 {{ stats.items.reserved }} réservés
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
          ✅ {{ stats.items.collected }} récupérés
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-900 dark:text-red-300">
          🚨 {{ stats.pendingReports }} signalements
        </span>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Utilisateurs</h2>
        <div class="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          <div class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ stats.users.total }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ stats.users.new7d }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">7 derniers jours</p>
          </div>
          <div class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ stats.users.new30d }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">30 derniers jours</p>
          </div>
        </div>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Monstres</h2>
        <div class="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          <div class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ stats.items.total }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div class="rounded-lg bg-brand-100 p-3 dark:bg-brand-950">
            <p class="text-lg font-semibold text-brand-700 dark:text-brand-300">{{ stats.items.available }}</p>
            <p class="text-xs text-brand-600 dark:text-brand-400">Disponibles</p>
          </div>
          <div class="rounded-lg bg-amber-100 p-3 dark:bg-amber-950">
            <p class="text-lg font-semibold text-amber-700 dark:text-amber-300">{{ stats.items.reserved }}</p>
            <p class="text-xs text-amber-600 dark:text-amber-400">Réservés</p>
          </div>
          <div class="rounded-lg bg-green-100 p-3 dark:bg-green-950">
            <p class="text-lg font-semibold text-green-700 dark:text-green-300">{{ stats.items.collected }}</p>
            <p class="text-xs text-green-600 dark:text-green-400">Récupérés</p>
          </div>
          <div class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ stats.items.hidden }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Masqués</p>
          </div>
          <div class="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ stats.items.new7d }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Nouveaux (7j)</p>
          </div>
        </div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Taux de récupération : <span class="font-semibold">{{ stats.items.collectionRate }}%</span>
        </p>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Signalements</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {{ stats.pendingReports }} signalement{{ stats.pendingReports > 1 ? 's' : '' }} en attente
        </p>
      </div>
    </div>
  </div>
</template>
