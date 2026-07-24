<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchAdminSettings, updateSetting, type AdminSetting } from '@/services/admin'

const settings = ref<AdminSetting[]>([])
const loading = ref(true)
const drafts = ref<Record<string, string>>({})
const busyKey = ref<string | null>(null)
const actionError = ref<string | null>(null)
const savedKey = ref<string | null>(null)
const previewHtml = ref(false)
const previewingKey = ref<string | null>(null)

interface SettingMeta {
  label: string
  description: string
  unit?: string
  placeholder?: string
}

const SETTINGS_META: Record<string, SettingMeta> = {
  reservation_duration_minutes: {
    label: 'Durée de réservation',
    description: 'Temps (en minutes) pendant lequel une réservation reste active. Passé ce délai, la réservation expire automatiquement et le Monstre redevient disponible.',
    unit: 'min',
    placeholder: '60',
  },
  max_user_subscriptions: {
    label: 'Zones surveillées max',
    description: 'Nombre maximum de zones d\'alerte qu\'un utilisateur peut créer. Chaque zone permet de recevoir des notifications quand un Monstre apparaît à proximité.',
    placeholder: '5',
  },
  max_subscription_radius: {
    label: 'Rayon max des alertes',
    description: 'Distance maximale (en mètres) du rayon de surveillance d\'une zone. Un Monstre dans ce rayon déclenche une notification.',
    unit: 'm',
    placeholder: '5000',
  },
  max_photos_per_item: {
    label: 'Photos par Monstre',
    description: 'Nombre maximum de photos qu\'un utilisateur peut ajouter lors de la publication d\'un Monstre.',
    placeholder: '3',
  },
  report_threshold: {
    label: 'Seuil de signalement',
    description: 'Nombre de signalements différents nécessaires pour masquer automatiquement un Monstre de la carte. Utile pour modérer les contenus inappropriés.',
    placeholder: '3',
  },
  already_collected_threshold: {
    label: 'Seuil "déjà récupéré"',
    description: 'Nombre de signalements "déjà récupéré" nécessaires pour clôturer automatiquement un Monstre et le marquer comme COLLECTED.',
    placeholder: '3',
  },
  points_creation: {
    label: 'Points de création',
    description: 'Nombre de points gagnés par un utilisateur quand il publie un nouveau Monstre. Ces points alimentent le score de confiance.',
    placeholder: '5',
  },
  points_recuperation: {
    label: 'Points de récupération',
    description: 'Nombre de points gagnés quand un utilisateur récupère réellement un Monstre (après validation du dépôt).',
    placeholder: '10',
  },
  points_validation: {
    label: 'Points de validation',
    description: 'Nombre de points gagnés quand un utilisateur valide la récupération d\'un Monstre par un autre membre.',
    placeholder: '5',
  },
  points_vote_utile: {
    label: 'Points de vote utile',
    description: 'Nombre de points gagnés quand le vote d\'un utilisateur est jugé utile par la communauté.',
    placeholder: '1',
  },
  ranking_weight_distance: {
    label: 'Poids : distance',
    description: 'Influence de la distance dans le calcul du score de classement (0 = pas d\'influence, 1 = poids maximum). La somme des 4 poids doit être égale à 1.',
    placeholder: '0.5',
  },
  ranking_weight_popularity: {
    label: 'Poids : popularité',
    description: 'Influence du nombre de votes/intérêts dans le score de classement.',
    placeholder: '0.25',
  },
  ranking_weight_recency: {
    label: 'Poids : fraîcheur',
    description: 'Influence de l\'ancienneté du Monstre dans le score de classement. Plus c\'est récent, mieux c\'est classé.',
    placeholder: '0.15',
  },
  ranking_weight_trust: {
    label: 'Poids : confiance',
    description: 'Influence du score de confiance du déposant dans le classement. Les déposants fiables sont mieux positionnés.',
    placeholder: '0.1',
  },
  email_verification_token_ttl_hours: {
    label: 'Validité lien vérification',
    description: 'Durée de validité (en heures) du lien envoyé par email pour vérifier son compte. Passé ce délai, le lien expiré doit être régénéré.',
    unit: 'h',
    placeholder: '24',
  },
  password_reset_token_ttl_minutes: {
    label: 'Validité lien mot de passe',
    description: 'Durée de validité (en minutes) du lien de réinitialisation du mot de passe envoyé par email.',
    unit: 'min',
    placeholder: '60',
  },
  pwa_enabled: {
    label: 'Installation PWA',
    description: 'Active le bouton "Installer l\'application" dans le profil. Permet aux utilisateurs d\'ajouter Les Monstres à leur écran d\'accueil comme une app native.',
  },
  beta_mode_enabled: {
    label: 'Bandeau version bêta',
    description: 'Affiche un bandeau en haut de l\'appli (masqué en admin) prévenant que c\'est une version bêta et que les Monstres affichés ne sont peut-être pas réels. À désactiver à l\'ouverture officielle.',
  },
  whatsapp_test_mode: {
    label: 'Mode test WhatsApp',
    description: 'En mode test, les notifications WhatsApp sont simulées en base sans être réellement envoyées. Utile pour le développement.',
  },
  facebook_share_enabled: {
    label: 'Partage groupe Facebook',
    description: 'Propose une case "Partager dans le groupe Facebook" (cochée par défaut) à la publication d\'un Monstre. Facebook ne permet pas de poster automatiquement dans un groupe : ça copie le texte du Monstre dans le presse-papier et ouvre le groupe, à l\'utilisateur de coller et publier.',
  },
  facebook_group_url: {
    label: 'URL du groupe Facebook',
    description: 'Lien du groupe Facebook cible (ex. https://www.facebook.com/groups/xxxxxxxxxx). Mettre le groupe de test pendant le développement, le vrai groupe en production.',
    placeholder: 'https://www.facebook.com/groups/...',
  },
  mission_content: {
    label: 'Contenu de la page /pourquoi',
    description: 'Contenu HTML affiché sur la page "Pourquoi Les Monstres". Utilise les balises &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;. Si vide, un contenu par défaut est affiché.',
  },
  legal_notices: {
    label: 'Mentions légales',
    description: 'Contenu HTML de la page /mentions-legales. Visible depuis le profil utilisateur.',
  },
  rgpd_content: {
    label: 'Politique de confidentialité (RGPD)',
    description: 'Contenu HTML de la page /rgpd. Visible depuis le profil utilisateur.',
  },
  data_deletion_content: {
    label: 'Suppression des données',
    description: 'Contenu HTML de la page /suppression. Instructions pour supprimer son compte.',
  },
}

const SECTIONS = [
  { title: '📍 Réservation & Abonnements', keys: ['reservation_duration_minutes', 'max_user_subscriptions', 'max_subscription_radius'] },
  { title: '📸 Photos & Signalements', keys: ['max_photos_per_item', 'report_threshold', 'already_collected_threshold'] },
  { title: '⭐ Points & Classement', keys: ['points_creation', 'points_recuperation', 'points_validation', 'points_vote_utile', 'ranking_weight_distance', 'ranking_weight_popularity', 'ranking_weight_recency', 'ranking_weight_trust'] },
  { title: '🔒 Sécurité', keys: ['email_verification_token_ttl_hours', 'password_reset_token_ttl_minutes'] },
  { title: '⚙️ Fonctionnalités', keys: ['pwa_enabled', 'beta_mode_enabled', 'whatsapp_test_mode'] },
  { title: '📘 Partage Facebook', keys: ['facebook_share_enabled', 'facebook_group_url'] },
  { title: '📝 Contenu', keys: ['mission_content', 'legal_notices', 'rgpd_content', 'data_deletion_content'] },
]

function meta(key: string): SettingMeta {
  return SETTINGS_META[key] ?? { label: key, description: '' }
}
function isBoolean(type: string) { return type === 'BOOLEAN' }
function isTextarea(key: string) { return key.endsWith('_content') || key === 'legal_notices' }
function hasChanged(key: string) { return drafts.value[key] !== settingByKey(key)?.value }
function settingByKey(key: string): AdminSetting | undefined { return settings.value.find((s) => s.key === key) }


const PREVIEW_ROUTES: Record<string, string> = {
  mission_content: '/pourquoi',
  legal_notices: '/mentions-legales',
  rgpd_content: '/rgpd',
  data_deletion_content: '/suppression',
}
function previewRoute(key: string) { return PREVIEW_ROUTES[key] ?? '/' }

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
      Paramètres modifiables sans redéploiement. Les changements sont appliqués immédiatement.
    </p>

    <p v-if="actionError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {{ actionError }}
    </p>

    <p v-if="loading" class="mt-6 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <template v-else>
      <div v-for="section in SECTIONS" :key="section.title" class="mt-8 first:mt-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ section.title }}</h3>

        <div class="mt-3 flex flex-col gap-4">
          <div
            v-for="key in section.keys"
            :key="key"
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header: label + key badge -->
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ meta(key).label }}</label>
              <span class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                {{ key }}
              </span>
              <span v-if="meta(key).unit" class="ml-auto text-xs text-gray-400 dark:text-gray-500">
                en {{ meta(key).unit }}
              </span>
            </div>

            <!-- Description -->
            <p class="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ meta(key).description }}</p>

            <!-- BOOLEAN toggle -->
            <div v-if="isBoolean(settingByKey(key)?.type ?? '')" class="mt-3">
              <button
                type="button"
                class="relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors"
                :class="drafts[key] === 'true' ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'"
                @click="drafts[key] = drafts[key] === 'true' ? 'false' : 'true'"
              >
                <span
                  class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
                  :class="drafts[key] === 'true' ? 'translate-x-[22px]' : 'translate-x-[4px]'"
                />
              </button>
              <span class="ml-2 text-sm" :class="drafts[key] === 'true' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'">
                {{ drafts[key] === 'true' ? 'Activé' : 'Désactivé' }}
              </span>
            </div>

            <!-- TEXTAREA (content fields) -->
            <template v-else-if="isTextarea(key)">
              <div class="mt-3 overflow-hidden rounded-lg border border-gray-300 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-gray-700 dark:focus-within:border-brand-500">
                <div class="flex items-center border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
                  <button
                    type="button"
                    class="rounded px-2 py-0.5 text-xs font-medium transition-colors"
                    :class="!(previewHtml && previewingKey === key) ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'"
                    @click="previewHtml = false; previewingKey = key"
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    class="rounded px-2 py-0.5 text-xs font-medium transition-colors"
                    :class="(previewHtml && previewingKey === key) ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'"
                    @click="previewHtml = true; previewingKey = key"
                  >
                    Aperçu
                  </button>
                </div>
                <textarea
                  v-if="!(previewHtml && previewingKey === key)"
                  v-model="drafts[key]"
                  rows="14"
                  class="w-full resize-y border-0 px-3 py-2.5 font-mono text-xs leading-relaxed text-gray-800 focus:outline-none dark:bg-gray-900 dark:text-gray-200"
                  @keyup.meta.enter="onSave(settingByKey(key)!)"
                  @keyup.ctrl.enter="onSave(settingByKey(key)!)"
                />
                <div
                  v-else
                  class="html-content min-h-[200px] max-w-none px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300"
                  v-html="drafts[key] || '<p class=\'text-gray-400\'>Aucun contenu</p>'"
                />
              </div>
              <p class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Cmd/Ctrl + Entrée pour sauvegarder.
                Aperçu sur <RouterLink :to="previewRoute(key)" target="_blank" class="text-brand-600 underline dark:text-brand-400">{{ previewRoute(key) }} ↗</RouterLink>.
              </p>
            </template>

            <!-- TEXT / NUMBER input -->
            <div v-else class="mt-3 flex items-center gap-2">
              <input
                v-model="drafts[key]"
                type="text"
                :placeholder="meta(key).placeholder"
                class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:focus:border-brand-500"
                @keyup.enter="onSave(settingByKey(key)!)"
              />
            </div>

            <!-- Save button (for non-boolean, non-textarea) -->
            <div v-if="!isBoolean(settingByKey(key)?.type ?? '') && !isTextarea(key)" class="mt-3 flex justify-end">
              <button
                type="button"
                :disabled="busyKey === key || !hasChanged(key)"
                class="rounded-lg px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-40"
                :class="savedKey === key
                  ? 'bg-green-600 text-white'
                  : hasChanged(key)
                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'"
                @click="onSave(settingByKey(key)!)"
              >
                {{ busyKey === key ? '…' : savedKey === key ? '✓ Sauvegardé' : 'Sauvegarder' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
