<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchAdminSettings, updateSetting, type AdminSetting } from '@/services/admin'

const settings = ref<AdminSetting[]>([])
const loading = ref(true)
const drafts = ref<Record<string, string>>({})
const busyKey = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function load() {
  loading.value = true
  settings.value = await fetchAdminSettings()
  drafts.value = Object.fromEntries(settings.value.map((s) => [s.key, s.value]))
  loading.value = false
}

onMounted(load)

async function onSave(setting: AdminSetting) {
  const value = drafts.value[setting.key]
  if (value === setting.value) return
  busyKey.value = setting.key
  actionError.value = null
  try {
    const updated = await updateSetting(setting.key, value)
    const index = settings.value.findIndex((s) => s.key === setting.key)
    if (index !== -1) settings.value[index] = updated
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    busyKey.value = null
  }
}
</script>

<template>
  <div>
    <p class="text-xs text-gray-400 dark:text-gray-500">
      Durées, seuils, points, poids de classement… modifiables sans redéploiement.
    </p>

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <ul v-else class="mt-4 flex flex-col gap-2">
      <li
        v-for="setting in settings"
        :key="setting.key"
        class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
      >
        <p class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ setting.key }}</p>
        <div class="mt-1 flex items-center gap-2">
          <label
            v-if="setting.type === 'BOOLEAN'"
            class="flex flex-1 items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <input
              type="checkbox"
              :checked="drafts[setting.key] === 'true'"
              class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700"
              @change="drafts[setting.key] = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
            />
            {{ drafts[setting.key] === 'true' ? 'Activé' : 'Désactivé' }}
          </label>
          <input
            v-else
            v-model="drafts[setting.key]"
            type="text"
            class="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            @keyup.enter="onSave(setting)"
          />
          <button
            type="button"
            :disabled="busyKey === setting.key || drafts[setting.key] === setting.value"
            class="rounded-lg bg-brand-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
            @click="onSave(setting)"
          >
            {{ busyKey === setting.key ? '…' : 'Sauver' }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
