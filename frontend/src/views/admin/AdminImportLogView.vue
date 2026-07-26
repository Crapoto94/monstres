<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchImportLogRuns, type AdminImportLogRun } from '@/services/admin'

const runs = ref<AdminImportLogRun[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const expandedRunId = ref<string | null>(null)

const DECISION_LABELS: Record<string, string> = {
  run: 'Passage sans nouveauté',
  imported: 'Importée',
  duplicate: 'Déjà importée (doublon)',
  skipped_found: 'Trouvaille ignorée',
  skipped_error: 'Erreur',
  skipped_other: 'Ignorée',
}
const DECISION_CLASSES: Record<string, string> = {
  imported: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  duplicate: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  skipped_found: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  skipped_error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  skipped_other: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  run: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
}

async function load() {
  loading.value = true
  const result = await fetchImportLogRuns({ page: page.value, pageSize: 15 })
  runs.value = result.runs
  totalPages.value = result.totalPages
  total.value = result.total
  loading.value = false
}

onMounted(load)

function changePage(delta: number) {
  page.value = Math.min(totalPages.value, Math.max(1, page.value + delta))
  load()
}

function toggle(runId: string) {
  expandedRunId.value = expandedRunId.value === runId ? null : runId
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function summary(run: AdminImportLogRun): string {
  const parts: string[] = []
  if (run.counts.imported) parts.push(`${run.counts.imported} importée${run.counts.imported > 1 ? 's' : ''}`)
  if (run.counts.duplicate) parts.push(`${run.counts.duplicate} doublon${run.counts.duplicate > 1 ? 's' : ''}`)
  if (run.counts.skipped_found) parts.push(`${run.counts.skipped_found} trouvaille${run.counts.skipped_found > 1 ? 's' : ''} ignorée${run.counts.skipped_found > 1 ? 's' : ''}`)
  if (run.counts.skipped_error) parts.push(`${run.counts.skipped_error} erreur${run.counts.skipped_error > 1 ? 's' : ''}`)
  if (run.counts.skipped_other) parts.push(`${run.counts.skipped_other} ignorée${run.counts.skipped_other > 1 ? 's' : ''}`)
  return parts.length ? parts.join(' · ') : 'Rien de neuf'
}
</script>

<template>
  <div>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Journal de chaque passage de la routine d'import (groupe Facebook → Monstres) : les annonces importées, mais aussi
      celles délibérément laissées de côté (doublons, trouvailles, erreurs).
    </p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <template v-else>
      <p class="mt-3 text-xs text-gray-400 dark:text-gray-500">{{ total }} passage(s)</p>

      <ul class="mt-2 flex flex-col gap-2">
        <li
          v-for="run in runs"
          :key="run.runId"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <button type="button" class="flex w-full items-center gap-3 p-3 text-left" @click="toggle(run.runId)">
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ formatDateTime(run.startedAt) }}
                <span
                  v-if="run.machine"
                  class="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-normal text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                >
                  {{ run.machine }}
                </span>
              </p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ summary(run) }}</p>
            </div>
            <span class="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{{ run.total }} ligne{{ run.total > 1 ? 's' : '' }}</span>
            <span class="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{{ expandedRunId === run.runId ? '▾' : '▸' }}</span>
          </button>

          <div v-if="expandedRunId === run.runId" class="border-t border-gray-100 dark:border-gray-800">
            <ul class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              <li v-for="entry in run.entries" :key="entry.id" class="flex items-start gap-2.5 px-3 py-2">
                <span
                  class="mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  :class="DECISION_CLASSES[entry.decision]"
                >
                  {{ DECISION_LABELS[entry.decision] ?? entry.decision }}
                </span>
                <div class="min-w-0 flex-1">
                  <p v-if="entry.title" class="truncate text-sm text-gray-800 dark:text-gray-200">{{ entry.title }}</p>
                  <p v-else class="text-sm text-gray-400 dark:text-gray-500">—</p>
                  <p v-if="entry.postId" class="truncate text-[11px] text-gray-400 dark:text-gray-500">{{ entry.postId }}</p>
                  <p v-if="entry.reason" class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{{ entry.reason }}</p>
                </div>
                <RouterLink
                  v-if="entry.itemId"
                  :to="`/monstres/${entry.itemId}`"
                  class="flex-shrink-0 text-[11px] font-medium text-brand-600 underline dark:text-brand-400"
                >
                  Voir
                </RouterLink>
              </li>
            </ul>
          </div>
        </li>
        <li v-if="runs.length === 0" class="text-sm text-gray-400 dark:text-gray-500">Aucun passage enregistré pour l'instant.</li>
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
