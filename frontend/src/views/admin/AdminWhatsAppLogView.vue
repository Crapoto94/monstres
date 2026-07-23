<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchWhatsAppLog, type AdminWhatsAppLogEntry } from '@/services/admin'

const logs = ref<AdminWhatsAppLogEntry[]>([])
const loading = ref(true)
const search = ref('')
const status = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const expandedId = ref<string | null>(null)

const STATUS_LABELS: Record<string, string> = {
  SENT: 'Envoyé',
  FAILED: 'Échec',
  SKIPPED: 'Non envoyé (mode dev)',
}

async function load() {
  loading.value = true
  const result = await fetchWhatsAppLog({ search: search.value || undefined, status: status.value || undefined, page: page.value })
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
      Journal de tous les messages WhatsApp envoyés (ou tentés) par l'appli — y compris les envois en mode test
      (<code class="font-mono">whatsapp_test_mode</code>, template <code class="font-mono">hello_world</code>) tant que le vrai
      template n'est pas encore approuvé par Meta.
    </p>

    <div class="mt-3 flex gap-2">
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher (destinataire, message)"
        class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        @keyup.enter="onSearch"
      />
      <select
        v-model="status"
        class="flex-shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        @change="onSearch"
      >
        <option value="">Tous les statuts</option>
        <option value="SENT">Envoyé</option>
        <option value="FAILED">Échec</option>
        <option value="SKIPPED">Non envoyé (mode dev)</option>
      </select>
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
      <p class="mt-3 text-xs text-gray-400 dark:text-gray-500">{{ total }} message(s)</p>

      <ul class="mt-2 flex flex-col gap-2">
        <li
          v-for="log in logs"
          :key="log.id"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <button type="button" class="flex w-full items-start gap-3 p-3 text-left" @click="toggle(log.id)">
            <span
              class="mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="{
                'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300': log.status === 'SENT',
                'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300': log.status === 'FAILED',
                'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400': log.status === 'SKIPPED',
              }"
            >
              {{ STATUS_LABELS[log.status] }}
            </span>
            <span
              v-if="log.testMode"
              class="mt-0.5 flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            >
              Test
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ log.message }}</p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                à {{ log.to }} · {{ log.templateName }}
              </p>
            </div>
            <p class="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{{ formatDateTime(log.createdAt) }}</p>
          </button>

          <div v-if="expandedId === log.id" class="border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
            <p v-if="log.error" class="text-[11px] text-red-600 dark:text-red-400">{{ log.error }}</p>
            <p v-if="log.testMode" class="text-[11px] text-amber-600 dark:text-amber-400">
              Mode test actif : le contenu réellement envoyé à Meta est le template "hello_world" pré-approuvé, pas ce message.
            </p>
            <p class="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-[11px] dark:bg-gray-900">{{ log.message }}</p>
          </div>
        </li>
        <li v-if="logs.length === 0" class="text-sm text-gray-400 dark:text-gray-500">Aucun message trouvé.</li>
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
