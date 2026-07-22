<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { api, type ApiSuccess } from '@/services/api'

interface EmailTemplate {
  id: string
  key: string
  name: string
  subject: string
  htmlContent: string
  isSystem: boolean
  createdAt: string
}

const templates = ref<EmailTemplate[]>([])
const loading = ref(true)
const editing = ref<EmailTemplate | null>(null)
const saving = ref(false)
const previewHtml = ref('')
const previewSubject = ref('')
const actionError = ref<string | null>(null)

const form = ref({ key: '', name: '', subject: '', htmlContent: '' })

const VARIABLES_BY_TEMPLATE: Record<string, string[]> = {
  email_verification: ['{{user_name}}', '{{verification_url}}'],
  password_reset: ['{{user_name}}', '{{reset_url}}'],
  new_item_nearby: ['{{item_title}}', '{{item_url}}', '{{item_photo_url}}'],
  reservation_created: ['{{item_title}}', '{{reserver_name}}', '{{item_url}}'],
  item_collected: ['{{item_title}}', '{{collector_name}}', '{{item_url}}'],
  badge_unlocked: ['{{badge_name}}'],
}

const currentVars = computed(() => {
  if (!editing.value) return ['{{user_name}}', '{{item_title}}', '{{item_url}}']
  return VARIABLES_BY_TEMPLATE[editing.value.key] ?? ['{{user_name}}']
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<ApiSuccess<EmailTemplate[]>>('/admin/email-templates')
    templates.value = data.data
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Erreur de chargement.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function startEdit(template: EmailTemplate) {
  editing.value = template
  form.value = { key: template.key, name: template.name, subject: template.subject, htmlContent: template.htmlContent }
  previewHtml.value = ''
  previewSubject.value = ''
}

function startCreate() {
  editing.value = { id: '', key: '', name: '', subject: '', htmlContent: '', isSystem: false, createdAt: '' }
  form.value = { key: '', name: '', subject: '', htmlContent: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">\n  <h2 style="color:#7c3aed;">Titre</h2>\n  <p>Bonjour <strong>{{user_name}}</strong>,</p>\n  <p>Contenu ici…</p>\n</div>' }
  previewHtml.value = ''
  previewSubject.value = ''
}

function cancel() {
  editing.value = null
  actionError.value = null
}

function insertVar(variable: string) {
  form.value.htmlContent += variable
}

async function save() {
  saving.value = true
  actionError.value = null
  try {
    if (editing.value?.id) {
      const { data } = await api.patch<ApiSuccess<EmailTemplate>>(`/admin/email-templates/${editing.value.id}`, {
        name: form.value.name,
        subject: form.value.subject,
        htmlContent: form.value.htmlContent,
      })
      const idx = templates.value.findIndex((t) => t.id === editing.value!.id)
      if (idx !== -1) templates.value[idx] = data.data
    } else {
      const { data } = await api.post<ApiSuccess<EmailTemplate>>('/admin/email-templates', form.value)
      templates.value.push(data.data)
    }
    editing.value = null
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Erreur de sauvegarde.'
  } finally {
    saving.value = false
  }
}

async function removeTemplate(id: string) {
  if (!confirm('Supprimer ce modèle ?')) return
  try {
    await api.delete(`/admin/email-templates/${id}`)
    templates.value = templates.value.filter((t) => t.id !== id)
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Erreur de suppression.'
  }
}

async function loadPreview() {
  if (!editing.value?.id) {
    previewHtml.value = form.value.htmlContent
    previewSubject.value = form.value.subject
    return
  }
  try {
    const { data } = await api.post<ApiSuccess<{ subject: string; htmlContent: string }>>(
      `/admin/email-templates/${editing.value.id}/preview`,
    )
    previewHtml.value = data.data.htmlContent
    previewSubject.value = data.data.subject
  } catch {
    previewHtml.value = form.value.htmlContent
    previewSubject.value = form.value.subject
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Modèles d'emails envoyés par l'application (vérification, réinitialisation, notifications…).
      </p>
      <button
        v-if="!editing"
        type="button"
        class="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
        @click="startCreate"
      >
        + Nouveau modèle
      </button>
    </div>

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>

    <!-- Edit form -->
    <div v-if="editing" class="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {{ editing.id ? 'Modifier le modèle' : 'Nouveau modèle' }}
        </h3>
        <button type="button" class="text-gray-400 hover:text-gray-600" @click="cancel">✕</button>
      </div>

      <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div v-if="!editing.id">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Clé (unique)</label>
          <input
            v-model="form.key"
            type="text"
            class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="ex: welcome_email"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Nom (interne)</label>
          <input
            v-model="form.name"
            type="text"
            class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="ex: Vérification d'email"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Sujet de l'email</label>
          <input
            v-model="form.subject"
            type="text"
            class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="ex: Confirme ton adresse email — Les Monstres"
          />
        </div>
      </div>

      <!-- Variables -->
      <div class="mt-3">
        <p class="text-[10px] font-medium uppercase text-gray-400">Variables disponibles</p>
        <div class="mt-1 flex flex-wrap gap-1">
          <button
            v-for="v in currentVars"
            :key="v"
            type="button"
            class="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-violet-600 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-900"
            @click="insertVar(v)"
          >
            {{ v }}
          </button>
        </div>
      </div>

      <!-- Content + Preview side by side -->
      <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Contenu HTML</label>
          <div class="mt-1 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
            <QuillEditor
              v-model:content="form.htmlContent"
              content-type="html"
              :options="{ theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']] } }"
              style="min-height: 200px"
            />
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Prévisualisation</label>
            <button
              type="button"
              class="text-xs text-violet-600 hover:text-violet-700"
              @click="loadPreview"
            >
              🔄 Actualiser
            </button>
          </div>
          <div class="mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" style="min-height: 200px">
            <div v-if="previewSubject" class="border-b border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-800">
              <strong>Sujet :</strong> {{ previewSubject }}
            </div>
            <div v-if="previewHtml" class="p-3" v-html="previewHtml" />
            <div v-else class="flex h-[200px] items-center justify-center text-xs text-gray-400">
              Cliquez sur « Actualiser » pour voir le rendu
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3 flex gap-2">
        <button
          type="button"
          :disabled="saving || !form.name || !form.subject || !form.htmlContent || (!editing.id && !form.key)"
          class="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          @click="save"
        >
          {{ saving ? '…' : editing.id ? 'Sauver' : 'Créer' }}
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

    <!-- Templates grid -->
    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <div v-else class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="template in templates"
        :key="template.id"
        class="group rounded-lg border border-gray-200 p-4 transition-colors hover:border-violet-300 dark:border-gray-800 dark:hover:border-violet-700"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">{{ template.name }}</p>
            <p class="mt-0.5 font-mono text-xs text-gray-400">{{ template.key }}</p>
          </div>
          <div class="flex gap-1">
            <button
              type="button"
              class="rounded p-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              @click="startEdit(template)"
            >
              ✏️
            </button>
            <button
              v-if="!template.isSystem"
              type="button"
              class="rounded p-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600"
              @click="removeTemplate(template.id)"
            >
              🗑️
            </button>
          </div>
        </div>
        <p class="mt-2 line-clamp-2 text-xs text-gray-500 italic dark:text-gray-400">{{ template.subject }}</p>
      </div>
    </div>
  </div>
</template>
