<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import {
  fetchNewsletterStatus,
  fetchNewsletterHistory,
  sendNewsletter,
  type NewsletterStatus,
  type NewsletterHistoryEntry,
} from '@/services/admin'

const status = ref<NewsletterStatus | null>(null)
const loading = ref(true)
const subject = ref('')
const htmlContent = ref('')
const submitting = ref(false)
const result = ref<string | null>(null)
const error = ref<string | null>(null)

const history = ref<NewsletterHistoryEntry[]>([])
const historyLoading = ref(true)

async function loadStatus() {
  loading.value = true
  try {
    status.value = await fetchNewsletterStatus()
  } catch {
    error.value = 'Impossible de charger le statut.'
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    history.value = await fetchNewsletterHistory()
  } catch {
    // silent
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  loadStatus()
  loadHistory()
})

async function onSubmit() {
  if (!subject.value.trim() || !htmlContent.value.trim()) return
  error.value = null
  result.value = null
  submitting.value = true
  try {
    const res = await sendNewsletter({ subject: subject.value, htmlContent: htmlContent.value })
    result.value = `✅ ${res.sentCount}/${res.totalTarget} envoyés avec succès${res.failedCount > 0 ? `, ${res.failedCount} échecs.` : '.'}`
    subject.value = ''
    htmlContent.value = ''
    await loadStatus()
    await loadHistory()
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Échec de l\'envoi.'
  } finally {
    submitting.value = false
  }
}

function formatDate(iso: string | null) {
  if (!iso) return 'Jamais'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Newsletter</h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Envoie un message à tous les utilisateurs qui ont accepté de recevoir des actualités.
    </p>

    <div class="mt-4 flex flex-col gap-6 lg:flex-row">
      <!-- Colonne gauche : formulaire -->
      <div class="min-w-0 flex-1">
        <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Chargement…</div>

        <div v-else-if="status" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex flex-wrap gap-6 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">Abonnés :</span>
              <span class="ml-1.5 font-semibold text-gray-900 dark:text-gray-100">{{ status.optedInCount }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Dernier envoi :</span>
              <span class="ml-1.5 text-gray-900 dark:text-gray-100">{{ formatDate(status.lastSentAt) }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fréquence :</span>
              <span class="ml-1.5 text-gray-900 dark:text-gray-100">tous les {{ status.frequencyDays }} jours</span>
            </div>
          </div>
          <div v-if="!status.canSend && status.reason" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            ⚠️ {{ status.reason }}
          </div>
        </div>

        <p v-if="error" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {{ error }}
        </p>

        <p v-if="result" class="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {{ result }}
        </p>

        <form v-if="status" class="mt-4 flex flex-col gap-4" @submit.prevent="onSubmit">
          <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            Sujet
            <input
              v-model="subject"
              type="text"
              required
              maxlength="200"
              placeholder="Ex : Nouveautés de juillet"
              class="rounded-xl border border-gray-200 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            Contenu
            <div class="newsletter-editor overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <QuillEditor
                v-model:content="htmlContent"
                content-type="html"
                :options="{ theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']] } }"
                style="min-height: 250px"
              />
            </div>
          </label>

          <div class="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <p class="font-medium text-gray-700 dark:text-gray-300">Aperçu</p>
            <div class="mt-1 html-content max-w-none" v-html="htmlContent || '<em>Aucun contenu</em>'" />
          </div>

          <button
            type="submit"
            :disabled="submitting || !status.canSend || status.optedInCount === 0"
            class="rounded-xl bg-brand-600 py-2.5 font-medium text-white shadow-sm shadow-brand-600/30 transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {{ submitting ? 'Envoi en cours…' : `Envoyer à ${status.optedInCount} abonné${status.optedInCount > 1 ? 's' : ''}` }}
          </button>
        </form>
      </div>

      <!-- Colonne droite : historique -->
      <div class="w-full shrink-0 lg:w-80">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Historique des envois</h3>

        <div v-if="historyLoading" class="mt-3 text-xs text-gray-500 dark:text-gray-400">Chargement…</div>

        <div v-else-if="history.length === 0" class="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-center text-xs text-gray-400 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Aucune newsletter envoyée
        </div>

        <div v-else class="mt-3 flex flex-col gap-2">
          <div
            v-for="(entry, i) in history"
            :key="i"
            class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{{ entry.subject }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ formatDate(entry.sentAt) }}</span>
              <span class="text-green-600 dark:text-green-400">{{ entry.sentCount }} envoyés</span>
              <span v-if="entry.failedCount > 0" class="text-red-500">{{ entry.failedCount }} échecs</span>
            </div>
            <div class="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              {{ entry.totalRecipients }} destinataire{{ entry.totalRecipients > 1 ? 's' : '' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.newsletter-editor .ql-toolbar.ql-snow {
  border-radius: 0.5rem 0.5rem 0 0;
  border-color: var(--color-gray-200);
}
.newsletter-editor .ql-container.ql-snow {
  border-radius: 0 0 0.5rem 0.5rem;
  border-color: var(--color-gray-200);
  font-family: inherit;
}
:root.dark .newsletter-editor .ql-toolbar.ql-snow {
  border-color: var(--color-gray-700);
  background: var(--color-gray-900);
}
:root.dark .newsletter-editor .ql-container.ql-snow {
  border-color: var(--color-gray-700);
  background: var(--color-gray-950);
  color: var(--color-gray-100);
}
:root.dark .newsletter-editor .ql-stroke {
  stroke: var(--color-gray-300);
}
:root.dark .newsletter-editor .ql-fill {
  fill: var(--color-gray-300);
}
</style>
