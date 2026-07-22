<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchAuditLog, type AdminAuditLogEntry } from '@/services/admin'

const logs = ref<AdminAuditLogEntry[]>([])
const loading = ref(true)
const actionFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const expandedId = ref<string | null>(null)

function isImageAvatar(avatar: string | null | undefined): boolean {
  return !!avatar && /^(\/|https?:\/\/)/.test(avatar)
}

async function load() {
  loading.value = true
  const result = await fetchAuditLog({ action: actionFilter.value || undefined, page: page.value })
  logs.value = result.logs
  totalPages.value = result.totalPages
  total.value = result.total
  loading.value = false
}

onMounted(load)

function onSearch() {
  page.value = 1
  load()
}

function changePage(delta: number) {
  page.value = Math.min(totalPages.value, Math.max(1, page.value + delta))
  load()
}

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Journal global des actions effectuées sur l'appli (qui, quoi, quand) — rempli automatiquement pour toute requête modifiant des données.
    </p>

    <div class="mt-3 flex gap-2">
      <input
        v-model="actionFilter"
        type="text"
        placeholder="Filtrer par action (ex : ItemsController, AdminUsersService...)"
        class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        @keyup.enter="onSearch"
      />
      <button
        type="button"
        class="flex-shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white"
        @click="onSearch"
      >
        Chercher
      </button>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <template v-else>
      <p class="mt-3 text-xs text-gray-400 dark:text-gray-500">{{ total }} action(s)</p>

      <ul class="mt-2 flex flex-col gap-2">
        <li
          v-for="log in logs"
          :key="log.id"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <button type="button" class="flex w-full items-start gap-3 p-3 text-left" @click="toggle(log.id)">
            <div
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs"
              :class="log.user && isImageAvatar(log.user.avatar) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'"
            >
              <img v-if="log.user && isImageAvatar(log.user.avatar)" :src="log.user.avatar!" class="h-8 w-8 rounded-full object-cover" alt="" />
              <span v-else-if="log.user">{{ log.user.name.charAt(0).toUpperCase() }}</span>
              <span v-else>?</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{{ log.action }}</p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                <span v-if="log.user">{{ log.user.name }} ({{ log.user.email }})</span>
                <span v-else class="italic">Anonyme</span>
              </p>
            </div>
            <p class="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{{ formatDateTime(log.createdAt) }}</p>
          </button>

          <div v-if="expandedId === log.id && log.data" class="border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
            <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ log.data.method }} {{ log.data.path }}</p>
            <pre v-if="Object.keys(log.data.params ?? {}).length" class="mt-1 overflow-x-auto rounded bg-white p-2 text-[11px] dark:bg-gray-900">{{ JSON.stringify(log.data.params, null, 2) }}</pre>
            <pre v-if="Object.keys(log.data.body ?? {}).length" class="mt-1 overflow-x-auto rounded bg-white p-2 text-[11px] dark:bg-gray-900">{{ JSON.stringify(log.data.body, null, 2) }}</pre>
          </div>
        </li>
        <li v-if="logs.length === 0" class="text-sm text-gray-400 dark:text-gray-500">Aucune action trouvée.</li>
      </ul>

      <div class="mt-4 flex items-center justify-between text-sm">
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
    </template>
  </div>
</template>
