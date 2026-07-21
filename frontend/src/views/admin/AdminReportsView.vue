<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchReportsQueue,
  resolveReport,
  suspendUser,
  type AdminReportQueueItem,
  type ReportDecision,
} from '@/services/admin'

const TYPE_LABELS: Record<string, string> = {
  FAKE: 'Faux Monstre',
  WRONG_LOCATION: 'Mauvaise localisation',
  INAPPROPRIATE: 'Contenu inapproprié',
  DUPLICATE: 'Doublon',
  ALREADY_COLLECTED: 'Déjà récupéré',
}

const items = ref<AdminReportQueueItem[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const busyId = ref<string | null>(null)

async function load() {
  loading.value = true
  const result = await fetchReportsQueue({ page: page.value })
  items.value = result.items
  totalPages.value = result.totalPages
  loading.value = false
}

onMounted(load)

function changePage(delta: number) {
  page.value = Math.min(totalPages.value, Math.max(1, page.value + delta))
  load()
}

async function onResolve(item: AdminReportQueueItem, decision: ReportDecision) {
  if (decision === 'DELETE' && !confirm(`Supprimer définitivement « ${item.title} » ?`)) return
  busyId.value = item.id
  try {
    await resolveReport(item.id, decision)
    await load()
  } finally {
    busyId.value = null
  }
}

async function onSanction(item: AdminReportQueueItem) {
  if (!confirm(`Suspendre temporairement ${item.user.name} ?`)) return
  busyId.value = item.id
  try {
    await suspendUser(item.user.id)
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <p class="text-xs text-gray-400 dark:text-gray-500">
      Monstres ayant atteint le seuil de signalements — à traiter en priorité.
    </p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    <p v-else-if="items.length === 0" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      Aucun Monstre en attente de modération.
    </p>

    <ul v-else class="mt-4 flex flex-col gap-3">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-lg border border-amber-300 p-3 text-sm dark:border-amber-700"
      >
        <div class="flex gap-3">
          <img
            v-if="item.photos[0]?.thumbnailPath || item.photos[0]?.path"
            :src="item.photos[0].thumbnailPath ?? item.photos[0].path"
            alt=""
            class="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ item.title }}</p>
            <p class="truncate text-xs text-gray-400 dark:text-gray-500">
              {{ item.user.name }} ({{ item.user.email }}) · confiance {{ item.user.trustScore }}
            </p>
          </div>
        </div>

        <ul class="mt-2 flex flex-col gap-1 border-t border-gray-100 pt-2 text-xs dark:border-gray-800">
          <li v-for="report in item.reports" :key="report.id" class="text-gray-600 dark:text-gray-300">
            <span class="font-medium">{{ TYPE_LABELS[report.type] ?? report.type }}</span>
            par {{ report.user.name }}
            <span v-if="report.reason" class="text-gray-400 dark:text-gray-500"> — « {{ report.reason }} »</span>
          </li>
        </ul>

        <div class="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-700"
            @click="onResolve(item, 'KEEP')"
          >
            Conserver
          </button>
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-amber-400 px-2 py-1 text-xs text-amber-700 disabled:opacity-40 dark:border-amber-600 dark:text-amber-300"
            @click="onResolve(item, 'HIDE')"
          >
            Masquer
          </button>
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
            @click="onResolve(item, 'DELETE')"
          >
            Supprimer
          </button>
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-700"
            @click="onSanction(item)"
          >
            Suspendre l'auteur
          </button>
        </div>
      </li>
    </ul>

    <div v-if="!loading && items.length > 0" class="mt-4 flex items-center justify-between text-sm">
      <button
        type="button"
        :disabled="page <= 1"
        class="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
        @click="changePage(-1)"
      >
        Précédent
      </button>
      <span class="text-gray-500 dark:text-gray-400">Page {{ page }} / {{ totalPages }}</span>
      <button
        type="button"
        :disabled="page >= totalPages"
        class="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
        @click="changePage(1)"
      >
        Suivant
      </button>
    </div>
  </div>
</template>
