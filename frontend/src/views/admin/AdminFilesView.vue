<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchFiles,
  createFileDirectory,
  uploadFile,
  downloadFile,
  deleteFile,
  type FileEntry,
} from '@/services/admin'

const currentPath = ref('')
const entries = ref<FileEntry[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const uploadFiles = ref<File[]>([])
const newDirName = ref('')

function joinPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

onMounted(async () => {
  await refresh()
})

async function refresh() {
  loading.value = true
  error.value = null
  try {
    entries.value = await fetchFiles(currentPath.value)
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Impossible de charger les fichiers.'
  } finally {
    loading.value = false
  }
}

function openDirectory(name: string) {
  currentPath.value = joinPath(currentPath.value, name)
  refresh()
}

function goUp() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = parts.join('/')
  refresh()
}

async function onCreateDirectory() {
  const name = newDirName.value.trim()
  if (!name) return
  busy.value = true
  error.value = null
  try {
    await createFileDirectory(joinPath(currentPath.value, name))
    newDirName.value = ''
    success.value = `Dossier « ${name} » créé.`
    await refresh()
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de la création du dossier.'
  } finally {
    busy.value = false
  }
}

async function onUpload() {
  if (!uploadFiles.value.length) return
  busy.value = true
  error.value = null
  success.value = null
  try {
    for (const file of uploadFiles.value) {
      await uploadFile(currentPath.value, file)
    }
    success.value = `${uploadFiles.value.length} fichier(s) uploadé(s).`
    uploadFiles.value = []
    await refresh()
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de l\'upload.'
  } finally {
    busy.value = false
  }
}

async function onDownload(entry: FileEntry) {
  const blob = await downloadFile(joinPath(currentPath.value, entry.name))
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = entry.name
  a.click()
  URL.revokeObjectURL(url)
}

async function onDelete(entry: FileEntry) {
  const label = entry.type === 'directory' ? 'dossier' : 'fichier'
  if (!confirm(`Supprimer le ${label} « ${entry.name} » ?`)) return
  try {
    await deleteFile(joinPath(currentPath.value, entry.name))
    success.value = `« ${entry.name} » supprimé.`
    await refresh()
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de la suppression.'
  }
}
</script>

<template>
  <div>
    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
      Fichiers du site (frontend/public/media)
    </p>
    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Gérez les images et fichiers du dossier media — ils sont servis publiquement
      (ex. <code>/media/xxx.jpg</code>) et peuvent être commités depuis le repo. Réservé
      SUPER_ADMIN.
    </p>

    <p v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-if="success" class="mt-3 text-sm text-green-600 dark:text-green-400">{{ success }}</p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        :disabled="!currentPath"
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        @click="goUp"
      >
        ↑ Dossier parent
      </button>
      <span class="max-w-full truncate font-mono text-xs text-gray-500 dark:text-gray-400">
        /media{{ currentPath ? '/' + currentPath : '' }}
      </span>
    </div>

    <div class="mt-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div v-if="loading" class="p-3 text-sm text-gray-500 dark:text-gray-400">Chargement…</div>

      <ul v-else-if="entries.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
        <li
          v-for="entry in entries"
          :key="entry.name"
          class="flex flex-wrap items-center gap-2 px-3 py-2"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-left"
            @click="entry.type === 'directory' ? openDirectory(entry.name) : onDownload(entry)"
          >
            <span class="text-base">{{ entry.type === 'directory' ? '📁' : '📄' }}</span>
            <span class="truncate font-mono text-xs text-gray-800 dark:text-gray-200">
              {{ entry.name }}
            </span>
            <span v-if="entry.type === 'file'" class="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
              {{ formatSize(entry.sizeBytes) }}
            </span>
          </button>
          <button
            v-if="entry.type === 'file'"
            type="button"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="onDownload(entry)"
          >
            Télécharger
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            @click="onDelete(entry)"
          >
            Supprimer
          </button>
        </li>
      </ul>

      <p v-else class="p-3 text-sm text-gray-400 dark:text-gray-500">Dossier vide.</p>
    </div>

    <div class="mt-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="newDirName"
          type="text"
          placeholder="nom-du-dossier"
          class="max-w-[220px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="button"
          :disabled="busy || !newDirName.trim()"
          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          @click="onCreateDirectory"
        >
          Créer un dossier
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <input
          type="file"
          multiple
          class="block w-full max-w-sm text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-200"
          @change="(e: any) => (uploadFiles = Array.from(e.target.files ?? []))"
        />
        <button
          type="button"
          :disabled="busy || !uploadFiles.length"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          @click="onUpload"
        >
          {{ busy ? 'Upload en cours…' : 'Uploader' }}
        </button>
      </div>
    </div>
  </div>
</template>
