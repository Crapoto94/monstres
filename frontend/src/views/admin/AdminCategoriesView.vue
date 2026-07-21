<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type AdminCategory,
} from '@/services/admin'

const categories = ref<AdminCategory[]>([])
const loading = ref(true)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)

const showForm = ref(false)
const name = ref('')
const icon = ref('')
const creating = ref(false)

async function load() {
  loading.value = true
  categories.value = await fetchAdminCategories()
  loading.value = false
}

onMounted(load)

async function onCreate() {
  if (!name.value.trim()) return
  creating.value = true
  error.value = null
  try {
    await createCategory({ name: name.value.trim(), icon: icon.value.trim() || undefined })
    name.value = ''
    icon.value = ''
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Impossible de créer la catégorie.'
  } finally {
    creating.value = false
  }
}

async function onToggleActive(category: AdminCategory) {
  busyId.value = category.id
  try {
    await updateCategory(category.id, { active: !category.active })
    await load()
  } finally {
    busyId.value = null
  }
}

async function onDelete(category: AdminCategory) {
  if (category._count.items > 0) {
    alert(`Impossible de supprimer : ${category._count.items} Monstre(s) rattaché(s) à cette catégorie.`)
    return
  }
  if (!confirm(`Supprimer la catégorie « ${category.name} » ?`)) return
  busyId.value = category.id
  try {
    await deleteCategory(category.id)
    await load()
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Catégories</h2>
      <button type="button" class="text-sm text-violet-600 dark:text-violet-400" @click="showForm = !showForm">
        {{ showForm ? 'Annuler' : '+ Ajouter' }}
      </button>
    </div>

    <form v-if="showForm" class="mt-3 flex flex-col gap-2 text-sm" @submit.prevent="onCreate">
      <input
        v-model="name"
        type="text"
        placeholder="Nom de la catégorie"
        class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      />
      <input
        v-model="icon"
        type="text"
        placeholder="Icône (optionnel, ex. un emoji)"
        class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      />
      <p v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        type="submit"
        :disabled="creating || !name.trim()"
        class="self-start rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {{ creating ? 'Création…' : 'Créer' }}
      </button>
    </form>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <ul v-else class="mt-4 flex flex-col gap-2">
      <li
        v-for="category in categories"
        :key="category.id"
        class="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
        :class="{ 'opacity-50': !category.active }"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-gray-900 dark:text-gray-100">
            {{ category.icon }} {{ category.name }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500">{{ category._count.items }} Monstre(s)</p>
        </div>
        <div class="flex flex-shrink-0 gap-2">
          <button
            type="button"
            :disabled="busyId === category.id"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-700"
            @click="onToggleActive(category)"
          >
            {{ category.active ? 'Désactiver' : 'Activer' }}
          </button>
          <button
            type="button"
            :disabled="busyId === category.id"
            class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
            @click="onDelete(category)"
          >
            Supprimer
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
