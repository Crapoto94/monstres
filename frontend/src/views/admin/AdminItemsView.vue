<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchAdminItems,
  updateItemStatus,
  deleteItem,
  deleteAllItems,
  fetchAdminCategories,
  fetchAdminItem,
  updateAdminItem,
  type AdminItemSummary,
  type AdminItemDetail,
  type AdminCategory,
} from '@/services/admin'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
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

// Édition d'un Monstre (titre, description, catégorie, position, adresse).
const editingItem = ref<AdminItemDetail | null>(null)
const editTitle = ref('')
const editDescription = ref('')
const editCategoryId = ref('')
const editLatitude = ref<number>(0)
const editLongitude = ref<number>(0)
const editAddress = ref('')
const savingEdit = ref(false)
const editError = ref<string | null>(null)

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

const clearingDb = ref(false)

async function onClearAll() {
  if (!confirm('⚠️ Supprimer TOUS les Monstres ? Cette action est irréversible.')) return
  if (!confirm('Vraiment tout supprimer ?')) return
  clearingDb.value = true
  actionError.value = null
  try {
    const result = await deleteAllItems()
    actionError.value = null
    alert(`${result.deleted} Monstre(s) supprimé(s).`)
    await load()
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    clearingDb.value = false
  }
}

async function onEdit(item: AdminItemSummary) {
  editError.value = null
  try {
    const detail = await fetchAdminItem(item.id)
    editingItem.value = detail
    editTitle.value = detail.title
    editDescription.value = detail.description ?? ''
    editCategoryId.value = detail.categoryId ?? ''
    editLatitude.value = detail.latitude
    editLongitude.value = detail.longitude
    editAddress.value = detail.address ?? ''
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Impossible de charger le Monstre.'
  }
}

async function onSaveEdit() {
  if (!editingItem.value) return
  savingEdit.value = true
  editError.value = null
  try {
    await updateAdminItem(editingItem.value.id, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim() || null,
      categoryId: editCategoryId.value || null,
      latitude: editLatitude.value,
      longitude: editLongitude.value,
      address: editAddress.value.trim() || null,
    })
    editingItem.value = null
    await load()
  } catch (e: any) {
    editError.value = e.response?.data?.error?.message ?? 'Enregistrement impossible.'
  } finally {
    savingEdit.value = false
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
          class="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white"
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

    <!-- Bouton vider la base (SUPER_ADMIN uniquement) -->
    <div v-if="auth.user?.role === 'SUPER_ADMIN'" class="mt-3">
      <button
        type="button"
        :disabled="clearingDb"
        class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-40 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
        @click="onClearAll"
      >
        {{ clearingDb ? 'Suppression…' : '🗑️ Vider la base (supprimer tous les Monstres)' }}
      </button>
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
              class="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="onEdit(item)"
            >
              Éditer
            </button>
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

    <!-- Modale d'édition d'un Monstre -->
    <Teleport to="body">
      <div
        v-if="editingItem"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-4"
      >
        <div class="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-4 shadow-xl dark:bg-gray-900">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Éditer le Monstre</h2>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              @click="editingItem = null"
            >
              ✕
            </button>
          </div>

          <div class="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto text-sm">
            <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              Titre
              <input
                v-model="editTitle"
                type="text"
                maxlength="120"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              Description
              <textarea
                v-model="editDescription"
                rows="3"
                maxlength="2000"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              Catégorie
              <select
                v-model="editCategoryId"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Sans catégorie</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
              </select>
            </label>
            <div class="flex gap-2">
              <label class="flex flex-1 flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                Latitude
                <input
                  v-model.number="editLatitude"
                  type="number"
                  step="any"
                  class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="flex flex-1 flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                Longitude
                <input
                  v-model.number="editLongitude"
                  type="number"
                  step="any"
                  class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
            </div>
            <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              Adresse (affichage)
              <input
                v-model="editAddress"
                type="text"
                maxlength="500"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>

            <p v-if="editError" class="text-xs text-red-600 dark:text-red-400">{{ editError }}</p>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="editingItem = null"
            >
              Annuler
            </button>
            <button
              type="button"
              :disabled="savingEdit"
              class="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              @click="onSaveEdit"
            >
              {{ savingEdit ? '…' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
