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

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  COLLECTED: 'Récupéré',
  PENDING_REVIEW: 'En revue',
  HIDDEN: 'Masqué',
  ARCHIVED: 'Archivé',
}

const items = ref<AdminReportQueueItem[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const busyId = ref<string | null>(null)
const actionError = ref<string | null>(null)

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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

function gpsDistance(item: AdminReportQueueItem): number | null {
  const lastReport = item.reports[item.reports.length - 1]
  if (!lastReport?.photoLatitude || !lastReport?.photoLongitude) return null
  return haversine(item.latitude, item.longitude, lastReport.photoLatitude, lastReport.photoLongitude)
}

async function onResolve(item: AdminReportQueueItem, decision: ReportDecision) {
  if (decision === 'DELETE' && !confirm(`Supprimer définitivement « ${item.title} » ?`)) return
  busyId.value = item.id
  actionError.value = null
  try {
    await resolveReport(item.id, decision)
    await load()
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    busyId.value = null
  }
}

async function onSanction(item: AdminReportQueueItem) {
  if (!confirm(`Suspendre temporairement ${item.user.name} ?`)) return
  busyId.value = item.id
  actionError.value = null
  try {
    await suspendUser(item.user.id)
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    busyId.value = null
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div>
    <p class="text-xs text-gray-400 dark:text-gray-500">
      Monstres ayant reçu au moins un signalement — à traiter en priorité.
    </p>

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    <p v-else-if="items.length === 0" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      Aucun Monstre en attente de modération.
    </p>

    <ul v-else class="mt-4 flex flex-col gap-4">
      <li
        v-for="item in items"
        :key="item.id"
        class="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm dark:border-amber-800 dark:bg-gray-900"
      >
        <!-- Header : photo + infos monstre -->
        <div class="flex gap-3 p-3">
          <img
            v-if="item.photos[0]?.thumbnailPath || item.photos[0]?.path"
            :src="item.photos[0].thumbnailPath ?? item.photos[0].path"
            alt=""
            class="h-24 w-24 flex-shrink-0 rounded-lg object-cover"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-semibold text-gray-900 dark:text-gray-100">{{ item.title }}</p>
                <p v-if="item.description" class="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{{ item.description }}</p>
              </div>
              <span
                class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                :class="item.status === 'PENDING_REVIEW'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
              >
                {{ STATUS_LABELS[item.status] ?? item.status }}
              </span>
            </div>

            <!-- Auteur -->
            <div class="mt-2 flex items-center gap-2">
              <div
                class="flex h-6 w-6 items-center justify-center rounded-full text-[10px]"
                :class="item.user.avatar && (item.user.avatar.startsWith('/') || item.user.avatar.startsWith('http')) ? '' : 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'"
              >
                <img v-if="item.user.avatar && (item.user.avatar.startsWith('/') || item.user.avatar.startsWith('http'))" :src="item.user.avatar" class="h-6 w-6 rounded-full object-cover" alt="" />
                <span v-else>{{ item.user.avatar ?? item.user.name.charAt(0).toUpperCase() }}</span>
              </div>
              <span class="text-xs text-gray-600 dark:text-gray-300">{{ item.user.name }}</span>
              <span class="text-[10px] text-gray-400 dark:text-gray-500">· confiance {{ item.user.trustScore }}</span>
            </div>

            <!-- Méta -->
            <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500">
              <span v-if="item.address">📍 {{ item.address }}</span>
              <span>📅 {{ formatDate(item.createdAt) }}</span>
              <span>🌐 {{ item.latitude.toFixed(5) }}, {{ item.longitude.toFixed(5) }}</span>
            </div>
          </div>
        </div>

        <!-- Distance photo vs monstre -->
        <div v-if="gpsDistance(item) !== null" class="border-t border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
          <span class="font-medium text-amber-600 dark:text-amber-400">⚠️ Écart GPS : {{ gpsDistance(item) }} km</span>
          <span class="ml-2 text-gray-400 dark:text-gray-500">
            (photo : {{ item.reports[item.reports.length - 1]?.photoLatitude?.toFixed(5) }}, {{ item.reports[item.reports.length - 1]?.photoLongitude?.toFixed(5) }})
          </span>
        </div>

        <!-- Signalements -->
        <ul class="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
          <li v-for="report in item.reports" :key="report.id" class="flex items-start gap-2 py-1 text-xs">
            <span class="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
            <div>
              <span class="font-medium text-gray-700 dark:text-gray-200">{{ TYPE_LABELS[report.type] ?? report.type }}</span>
              <span class="text-gray-400 dark:text-gray-500"> par {{ report.user.name }}</span>
              <span v-if="report.reason" class="text-gray-400 dark:text-gray-500"> — « {{ report.reason }} »</span>
              <span v-if="report.photoLatitude" class="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
                · GPS photo: {{ report.photoLatitude?.toFixed(5) }}, {{ report.photoLongitude?.toFixed(5) }}
              </span>
            </div>
          </li>
        </ul>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            @click="onResolve(item, 'KEEP')"
          >
            ✓ Conserver
          </button>
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-40 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
            @click="onResolve(item, 'HIDE')"
          >
            👁 Masquer
          </button>
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            @click="onResolve(item, 'DELETE')"
          >
            ✕ Supprimer
          </button>
          <button
            type="button"
            :disabled="busyId === item.id"
            class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            @click="onSanction(item)"
          >
            ⏸ Suspendre l'auteur
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
