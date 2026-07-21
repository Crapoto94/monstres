<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchAdminItems,
  updateItemStatus,
  deleteItem,
  fetchAdminCategories,
  type AdminItemSummary,
  type AdminCategory,
} from '@/services/admin'

const STATUSES = ['AVAILABLE', 'RESERVED', 'COLLECTED', 'PENDING_REVIEW', 'HIDDEN', 'ARCHIVED']

const items = ref<AdminItemSummary[]>([])
const categories = ref<AdminCategory[]>([])
const loading = ref(true)
const search = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const busyId = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function load() {
  loading.value = true
  const result = await fetchAdminItems({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    categoryId: categoryFilter.value || undefined,
    page: page.value,
  })
  items.value = result.items
  totalPages.value = result.totalPages
  loading.value = false
}

onMounted(async () => {
  categories.value = await fetchAdminCategories()
  await load()
})

function onSearch() {
  page.value = 1
  load()
}

function changePage(delta: number) {
  page.value = Math.min(totalPages.value, Math.max(1, page.value + delta))
  load()
}

async function onStatusChange(item: AdminItemSummary, event: Event) {
  const status = (event.target as HTMLSelectElement).value
  busyId.value = item.id
  actionError.value = null
  try {
    await updateItemStatus(item.id, status)
    await load()
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    busyId.value = null
  }
}

async function onDelete(item: AdminItemSummary) {
  if (!confirm(`Supprimer définitivement « ${item.title} » ? Cette action est irréversible.`)) return
  busyId.value = item.id
  actionError.value = null
  try {
    await deleteItem(item.id)
    await load()
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher (titre)"
          class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          @keyup.enter="onSearch"
        />
        <button
          type="button"
          class="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"
          @click="onSearch"
        >
          Chercher
        </button>
      </div>
      <div class="flex gap-2">
        <select
          v-model="statusFilter"
          class="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"
          @change="onSearch"
        >
          <option value="">Tous les statuts</option>
          <option v-for="status in STATUSES" :key="status" :value="status">{{ status }}</option>
        </select>
        <select
          v-model="categoryFilter"
          class="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"
          @change="onSearch"
        >
          <option value="">Toutes les catégories</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </div>
    </div>

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <ul v-else class="mt-4 flex flex-col gap-2">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
      >
        <img
          v-if="item.photos[0]?.thumbnailPath || item.photos[0]?.path"
          :src="item.photos[0].thumbnailPath ?? item.photos[0].path"
          alt=""
          class="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ item.title }}</p>
          <p class="truncate text-xs text-gray-400 dark:text-gray-500">
            {{ item.user.name }} ({{ item.user.email }}) · {{ item.category?.name ?? 'sans catégorie' }}
          </p>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <select
              :value="item.status"
              :disabled="busyId === item.id"
              class="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
              @change="onStatusChange(item, $event)"
            >
              <option v-for="status in STATUSES" :key="status" :value="status">{{ status }}</option>
            </select>
            <button
              type="button"
              :disabled="busyId === item.id"
              class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
              @click="onDelete(item)"
            >
              Supprimer
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="!loading" class="mt-4 flex items-center justify-between text-sm">
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
