<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listTables, execSql } from '@/services/admin'

const tables = ref<string[]>([])
const loading = ref(true)
const sql = ref('')
const result = ref<any[] | null>(null)
const resultCount = ref(0)
const executing = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const data = await listTables()
    tables.value = data.tables
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Impossible de charger les tables.'
  } finally {
    loading.value = false
  }
})

async function onExecute() {
  if (!sql.value.trim()) return
  executing.value = true
  error.value = null
  result.value = null
  try {
    const data = await execSql(sql.value.trim())
    result.value = data.rows
    resultCount.value = data.count
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Erreur SQL.'
  } finally {
    executing.value = false
  }
}

function selectTable(name: string) {
  sql.value = `SELECT * FROM "${name}" LIMIT 100`
}
</script>

<template>
  <div>
    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Tables de la base</p>

    <p v-if="loading" class="mt-2 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <div v-else class="mt-2 flex flex-wrap gap-2">
      <button
        v-for="table in tables"
        :key="table"
        type="button"
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        @click="selectTable(table)"
      >
        {{ table }}
      </button>
    </div>

    <div class="mt-4">
      <textarea
        v-model="sql"
        rows="4"
        placeholder="SELECT * FROM users LIMIT 10"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
      ></textarea>

      <button
        type="button"
        :disabled="executing || !sql.trim()"
        class="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        @click="onExecute"
      >
        {{ executing ? 'Exécution…' : 'Exécuter' }}
      </button>
    </div>

    <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <div v-if="result !== null" class="mt-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ resultCount }} résultat(s)</p>

      <div v-if="result.length > 0" class="mt-2 overflow-x-auto">
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                v-for="key in Object.keys(result[0])"
                :key="key"
                class="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-medium dark:border-gray-700 dark:bg-gray-800"
              >
                {{ key }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in result" :key="i">
              <td
                v-for="key in Object.keys(row)"
                :key="key"
                class="max-w-[200px] truncate border border-gray-300 px-2 py-1 dark:border-gray-700"
                :title="String(row[key])"
              >
                {{ row[key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-2 text-sm text-gray-400 dark:text-gray-500">Aucun résultat.</p>
    </div>
  </div>
</template>
