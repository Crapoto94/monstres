<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, type ApiSuccess } from '@/services/api'

interface TutorialPage {
  id: string
  order: number
  title: string
  content: string
  icon: string | null
  active: boolean
  createdAt: string
}

const pages = ref<TutorialPage[]>([])
const loading = ref(true)
const editing = ref<TutorialPage | null>(null)
const saving = ref(false)
const actionError = ref<string | null>(null)

const form = ref({ order: 0, title: '', content: '', icon: '', active: true })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<ApiSuccess<TutorialPage[]>>('/admin/tutorial')
    pages.value = data.data
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Erreur de chargement.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function startCreate() {
  editing.value = null
  form.value = { order: pages.value.length, title: '', content: '', icon: '✨', active: true }
}

function startEdit(page: TutorialPage) {
  editing.value = page
  form.value = { order: page.order, title: page.title, content: page.content, icon: page.icon ?? '', active: page.active }
}

function cancel() {
  editing.value = null
  actionError.value = null
}

async function save() {
  saving.value = true
  actionError.value = null
  try {
    if (editing.value) {
      const { data } = await api.patch<ApiSuccess<TutorialPage>>(`/admin/tutorial/${editing.value.id}`, form.value)
      const idx = pages.value.findIndex((p) => p.id === editing.value!.id)
      if (idx !== -1) pages.value[idx] = data.data
    } else {
      const { data } = await api.post<ApiSuccess<TutorialPage>>('/admin/tutorial', form.value)
      pages.value.push(data.data)
    }
    editing.value = null
    pages.value.sort((a, b) => a.order - b.order)
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Erreur de sauvegarde.'
  } finally {
    saving.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Supprimer cette page du tutoriel ?')) return
  try {
    await api.delete(`/admin/tutorial/${id}`)
    pages.value = pages.value.filter((p) => p.id !== id)
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Erreur de suppression.'
  }
}

async function toggleActive(page: TutorialPage) {
  try {
    const { data } = await api.patch<ApiSuccess<TutorialPage>>(`/admin/tutorial/${page.id}`, { active: !page.active })
    const idx = pages.value.findIndex((p) => p.id === page.id)
    if (idx !== -1) pages.value[idx] = data.data
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Erreur.'
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Pages du tutoriel affiché aux nouveaux utilisateurs après leur inscription.
      </p>
      <button
        v-if="!editing"
        type="button"
        class="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
        @click="startCreate"
      >
        + Nouvelle page
      </button>
    </div>

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>

    <!-- Edit form -->
    <div v-if="editing || form.title !== '' || form.content !== ''" class="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ editing ? 'Modifier la page' : 'Nouvelle page' }}
      </h3>

      <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Ordre</label>
          <input
            v-model.number="form.order"
            type="number"
            class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Icône (emoji)</label>
          <input
            v-model="form.icon"
            type="text"
            maxlength="4"
            class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="👋"
          />
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="form.active" type="checkbox" class="rounded" />
            Active
          </label>
        </div>
      </div>

      <div class="mt-3">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Titre</label>
        <input
          v-model="form.title"
          type="text"
          class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          placeholder="Titre de la page"
        />
      </div>

      <div class="mt-3">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Contenu (HTML)</label>
        <textarea
          v-model="form.content"
          rows="6"
          class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
          placeholder="<p>Contenu de la page…</p>"
        />
        <div class="mt-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <p class="text-[10px] font-medium uppercase text-gray-400">Prévisualisation</p>
          <div class="prose prose-sm mt-1 max-w-none text-gray-700 dark:text-gray-300" v-html="form.content" />
        </div>
      </div>

      <div class="mt-3 flex gap-2">
        <button
          type="button"
          :disabled="saving || !form.title || !form.content"
          class="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          @click="save"
        >
          {{ saving ? '…' : editing ? 'Sauver' : 'Créer' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400"
          @click="cancel"
        >
          Annuler
        </button>
      </div>
    </div>

    <!-- Pages list -->
    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <ul v-else class="mt-4 flex flex-col gap-2">
      <li
        v-for="page in pages"
        :key="page.id"
        class="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
      >
        <span class="text-2xl">{{ page.icon ?? '📄' }}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">#{page.order}</span>
            <span class="font-medium text-gray-900 dark:text-gray-100">{{ page.title }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="page.active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
            >
              {{ page.active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="prose prose-xs mt-1 max-w-none text-gray-500 dark:text-gray-400" v-html="page.content.slice(0, 150) + (page.content.length > 150 ? '…' : '')" />
        </div>
        <div class="flex gap-1">
          <button
            type="button"
            class="rounded p-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            @click="toggleActive(page)"
            :title="page.active ? 'Désactiver' : 'Activer'"
          >
            {{ page.active ? '👁️' : '🚫' }}
          </button>
          <button
            type="button"
            class="rounded p-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            @click="startEdit(page)"
          >
            ✏️
          </button>
          <button
            type="button"
            class="rounded p-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600"
            @click="remove(page.id)"
          >
            🗑️
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
