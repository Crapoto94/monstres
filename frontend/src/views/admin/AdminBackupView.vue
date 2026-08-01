<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchBackups,
  createBackup,
  downloadBackup,
  deleteBackup,
  restoreLocalBackup,
  restoreUploadBackup,
  type BackupFile,
} from '@/services/admin'

const backups = ref<BackupFile[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const uploadFile = ref<File | null>(null)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  try {
    backups.value = await fetchBackups()
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Impossible de charger les sauvegardes.'
  } finally {
    loading.value = false
  }
})

async function refresh() {
  backups.value = await fetchBackups()
}

async function onCreateBackup() {
  busy.value = true
  error.value = null
  success.value = null
  try {
    const backup = await createBackup()
    await refresh()
    success.value = `Sauvegarde « ${backup.name} » créée.`
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de la sauvegarde.'
  } finally {
    busy.value = false
  }
}

async function onDownload(backup: BackupFile) {
  const blob = await downloadBackup(backup.name)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backup.name
  a.click()
  URL.revokeObjectURL(url)
}

async function onDelete(backup: BackupFile) {
  if (!confirm(`Supprimer la sauvegarde « ${backup.name} » ?`)) return
  try {
    await deleteBackup(backup.name)
    backups.value = backups.value.filter((b) => b.name !== backup.name)
    success.value = `Sauvegarde « ${backup.name} » supprimée.`
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de la suppression.'
  }
}

async function onRestoreLocal(backup: BackupFile) {
  const message =
    `Restaurer la base avec la sauvegarde « ${backup.name} » ?\n\n` +
    'La base actuelle sera remplacée et l\'application redémarrera la connexion. Cette action est irréversible.'
  if (!confirm(message)) return
  busy.value = true
  error.value = null
  success.value = null
  try {
    await restoreLocalBackup(backup.name)
    success.value = `Base restaurée depuis « ${backup.name} ».`
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de la restauration.'
  } finally {
    busy.value = false
  }
}

async function onRestoreUpload() {
  if (!uploadFile.value) return
  const message =
    `Restaurer la base avec le fichier « ${uploadFile.value.name} » ?\n\n` +
    'La base actuelle sera remplacée et l\'application redémarrera la connexion. Cette action est irréversible.'
  if (!confirm(message)) return
  busy.value = true
  error.value = null
  success.value = null
  try {
    await restoreUploadBackup(uploadFile.value)
    success.value = `Base restaurée depuis « ${uploadFile.value.name} ».`
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de la restauration.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
      Sauvegardes de la base de données
    </p>
    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Une sauvegarde automatique est créée chaque jour à 04:00 et notifiée par email. Vous pouvez
      aussi en créer une manuellement, télécharger, supprimer ou restaurer une sauvegarde locale,
      ou restaurer depuis un fichier uploadé.
    </p>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="busy"
        class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        @click="onCreateBackup"
      >
        {{ busy ? 'Sauvegarde en cours…' : 'Créer une sauvegarde' }}
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-if="success" class="mt-3 text-sm text-green-600 dark:text-green-400">{{ success }}</p>

    <div class="mt-4">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Sauvegardes locales</p>

      <p v-if="loading" class="mt-2 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

      <ul v-else-if="backups.length > 0" class="mt-2 flex flex-col gap-2">
        <li
          v-for="backup in backups"
          :key="backup.name"
          class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate font-mono text-xs text-gray-800 dark:text-gray-200">
              {{ backup.name }}
            </span>
            <span class="block text-[11px] text-gray-400 dark:text-gray-500">
              {{ formatDate(backup.createdAt) }} · {{ formatSize(backup.sizeBytes) }}
            </span>
          </span>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="onDownload(backup)"
          >
            Télécharger
          </button>
          <button
            type="button"
            class="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
            @click="onRestoreLocal(backup)"
          >
            Restaurer
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            @click="onDelete(backup)"
          >
            Supprimer
          </button>
        </li>
      </ul>

      <p v-else class="mt-2 text-sm text-gray-400 dark:text-gray-500">
        Aucune sauvegarde pour l'instant.
      </p>
    </div>

    <div class="mt-6">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Restaurer depuis un fichier uploadé
      </p>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".db,.sqlite,application/octet-stream"
          class="block w-full max-w-sm text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-200"
          @change="(e: any) => (uploadFile = e.target.files?.[0] ?? null)"
        />
        <button
          type="button"
          :disabled="busy || !uploadFile"
          class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          @click="onRestoreUpload"
        >
          {{ busy ? 'Restauration en cours…' : 'Restaurer ce fichier' }}
        </button>
      </div>
    </div>
  </div>
</template>
