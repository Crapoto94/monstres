<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchAdminSettings, updateSetting, type AdminSetting } from '@/services/admin'

const settings = ref<AdminSetting[]>([])
const loading = ref(true)
const drafts = ref<Record<string, string>>({})
const busyKey = ref<string | null>(null)
const actionError = ref<string | null>(null)
const savedKey = ref<string | null>(null)

const SECTIONS = [
  {
    title: '📍 Réservation & Abonnements',
    keys: ['reservation_duration_minutes', 'max_user_subscriptions', 'max_subscription_radius'],
  },
  {
    title: '📸 Photos & Signalements',
    keys: ['max_photos_per_item', 'report_threshold', 'already_collected_threshold'],
  },
  {
    title: '⭐ Points & Classement',
    keys: ['points_creation', 'points_recuperation', 'points_validation', 'points_vote_utile', 'ranking_weight_distance', 'ranking_weight_popularity', 'ranking_weight_recency', 'ranking_weight_trust'],
  },
  {
    title: '🔒 Sécurité',
    keys: ['email_verification_token_ttl_hours', 'password_reset_token_ttl_minutes'],
  },
  {
    title: '⚙️ Fonctionnalités',
    keys: ['pwa_enabled', 'whatsapp_test_mode'],
  },
  {
    title: '📝 Contenu',
    keys: ['mission_content'],
  },
]

const DESCRIPTIONS: Record<string, string> = {
  reservation_duration_minutes: 'Durée (min) pendant laquelle une réservation reste active avant expiration.',
  max_user_subscriptions: 'Nombre maximum de zones surveillées par utilisateur.',
  max_subscription_radius: 'Rayon max (m) d\'une zone d\'alerte.',
  max_photos_per_item: 'Nombre max de photos par Monstre.',
  report_threshold: 'Nombre de signalements pour masquer automatiquement un Monstre.',
  already_collected_threshold: 'Nombre de signalements "déjà récupéré" pour clôturer un Monstre.',
  points_creation: 'Points gagnés en créant un Monstre.',
  points_recuperation: 'Points gagnés en récupérant un Monstre.',
  points_validation: 'Points gagnés en validant une récupération.',
  points_vote_utile: 'Points gagnés quand ton vote est jugé utile.',
  ranking_weight_distance: 'Poids de la distance dans le score de classement (0–1).',
  ranking_weight_popularity: 'Poids de la popularité dans le score de classement (0–1).',
  ranking_weight_recency: 'Poids de la fraîcheur dans le score de classement (0–1).',
  ranking_weight_trust: 'Poids de la confiance dans le score de classement (0–1).',
  email_verification_token_ttl_hours: 'Durée de validité (heures) du lien de vérification email.',
  password_reset_token_ttl_minutes: 'Durée de validité (minutes) du lien de réinitialisation mot de passe.',
  pwa_enabled: 'Activer l\'installation de la Progressive Web App.',
  whatsapp_test_mode: 'Mode test WhatsApp (les messages ne sont pas réellement envoyés).',
  mission_content: 'Contenu HTML de la page "/pourquoi". Utilise &lt;h2&gt; pour les titres, &lt;p&gt; pour les paragraphes.',
}

const isTextarea = (key: string) => key === 'mission_content'
const isBoolean = (type: string) => type === 'BOOLEAN'

function settingByKey(key: string): AdminSetting | undefined {
  return settings.value.find((s) => s.key === key)
}

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
  savedKey.value = null
  try {
    const updated = await updateSetting(setting.key, value)
    const index = settings.value.findIndex((s) => s.key === setting.key)
    if (index !== -1) settings.value[index] = updated
    savedKey.value = setting.key
    setTimeout(() => { if (savedKey.value === setting.key) savedKey.value = null }, 2000)
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    busyKey.value = null
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Durées, seuils, points, poids de classement… modifiables sans redéploiement.
    </p>

    <p v-if="actionError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {{ actionError }}
    </p>

    <p v-if="loading" class="mt-6 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <template v-else>
      <div v-for="section in SECTIONS" :key="section.title" class="mt-6">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ section.title }}</h3>

        <div class="mt-2 flex flex-col gap-3">
          <div
            v-for="key in section.keys"
            :key="key"
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p class="font-mono text-xs text-gray-400 dark:text-gray-500">{{ key }}</p>
            <p v-if="DESCRIPTIONS[key]" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ DESCRIPTIONS[key] }}</p>

            <div class="mt-2 flex items-start gap-2">
              <!-- BOOLEAN -->
              <label
                v-if="isBoolean(settingByKey(key)?.type ?? '')"
                class="flex flex-1 items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  :checked="drafts[key] === 'true'"
                  class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700"
                  @change="drafts[key] = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
                />
                {{ drafts[key] === 'true' ? 'Activé' : 'Désactivé' }}
              </label>

              <!-- TEXTAREA (mission_content) -->
              <textarea
                v-else-if="isTextarea(key)"
                v-model="drafts[key]"
                rows="12"
                class="min-h-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs leading-relaxed dark:border-gray-700 dark:bg-gray-950"
                @keyup.meta.enter="onSave(settingByKey(key)!)"
                @keyup.ctrl.enter="onSave(settingByKey(key)!)"
              />

              <!-- TEXT / NUMBER -->
              <input
                v-else
                v-model="drafts[key]"
                type="text"
                class="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                @keyup.enter="onSave(settingByKey(key)!)"
              />

              <button
                type="button"
                :disabled="busyKey === key || drafts[key] === settingByKey(key)?.value"
                class="flex-shrink-0 self-start rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
                :class="savedKey === key
                  ? 'bg-green-600 text-white'
                  : 'bg-brand-600 text-white hover:bg-brand-700'"
                @click="onSave(settingByKey(key)!)"
              >
                {{ busyKey === key ? '…' : savedKey === key ? '✓' : 'Sauver' }}
              </button>
            </div>

            <p v-if="isTextarea(key)" class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Cmd/Ctrl + Entrée pour sauvegarder. Prévisualisation sur <RouterLink to="/pourquoi" class="text-brand-600 dark:text-brand-400">/pourquoi</RouterLink>.
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
