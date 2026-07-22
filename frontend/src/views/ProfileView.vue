<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { api, type ApiSuccess } from '@/services/api'
import type { AuthUser } from '@/services/auth'

const router = useRouter()
const { canInstall, installed, install } = usePwaInstall()

const auth = useAuthStore()

const AVATARS = [
  '😺', '🐶', '🦊', '🐻', '🐼', '🐨', '🦁', '🐮', '🐷', '🐸',
  '🐵', '🐔', '🐧', '🐦', '🦄', '🐙', '🦀', '🐳', '🌸', '🌻',
  '🍄', '⚡', '🔥', '💎', '🎯', '🚀', '🎸', '🎨', '👾', '🤖',
  '👻', '💀', '🎃', '🦊', '🦋', '🐢', '🐬', '🦜', '🐲', '🦄',
  '🌈', '🍕', '🎸', '🪐', '🏆', '🎲', '🧊', '🪺', '🧩', '🎪',
]

const selectedAvatar = computed(() => auth.user?.avatar ?? null)
const isImageAvatar = computed(() => /^(\/|https?:\/\/)/.test(selectedAvatar.value ?? ''))
const uploading = ref(false)
const uploadError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const phoneDraft = ref(auth.user?.phoneNumber ?? '')
const savingPhone = ref(false)
const phoneError = ref<string | null>(null)

function selectAvatar(emoji: string) {
  auth.setAvatar(selectedAvatar.value === emoji ? null : emoji)
}

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = null

  const formData = new FormData()
  formData.append('avatar', file)

  try {
    const { data } = await api.post<ApiSuccess<AuthUser>>('/users/me/avatar/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    auth.user = data.data
  } catch (e: any) {
    uploadError.value = e.response?.data?.error?.message ?? "Erreur lors de l'upload."
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function onSavePhone() {
  savingPhone.value = true
  phoneError.value = null
  try {
    await auth.setPhoneNumber(phoneDraft.value.trim() || null)
  } catch (e: any) {
    phoneError.value = e.response?.data?.error?.message ?? 'Numéro invalide.'
  } finally {
    savingPhone.value = false
  }
}

async function onToggleWhatsapp() {
  if (!auth.user?.phoneNumber) return
  await auth.setWhatsappNotifications(!auth.user.whatsappNotifications)
}

async function onDeleteAccount() {
  if (!confirm('Supprimer définitivement ton compte et toutes tes données ? Cette action est irréversible.')) return
  deleting.value = true
  deleteError.value = null
  try {
    await auth.deleteAccount()
    router.push('/')
  } catch (e: any) {
    deleteError.value = e.response?.data?.error?.message ?? 'Impossible de supprimer le compte.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="flex-1 p-4 pb-24">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Mon profil</h1>

    <template v-if="auth.isAuthenticated && auth.user">
      <!-- Actions rapides -->
      <div class="mt-4 flex flex-wrap gap-2">
        <RouterLink
          to="/communaute"
          class="inline-flex items-center gap-2 rounded-xl bg-brand-100 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-200 dark:bg-brand-900 dark:text-brand-300 dark:hover:bg-brand-800"
        >
          👥 Communauté
        </RouterLink>
        <RouterLink
          v-if="auth.isModerator"
          :to="auth.isAdmin ? '/admin' : '/admin/signalements'"
          class="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800"
        >
          ⚙️ {{ auth.isAdmin ? 'Administration' : 'Modération' }}
        </RouterLink>
      </div>

      <!-- Profil card -->
      <div class="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center gap-4">
          <div
            class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-3xl"
            :class="isImageAvatar ? '' : 'bg-brand-100 dark:bg-brand-900'"
          >
            <img v-if="isImageAvatar" :src="selectedAvatar!" class="h-16 w-16 rounded-full object-cover" alt="" />
            <span v-else>{{ selectedAvatar ?? auth.user.name.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-gray-900 dark:text-gray-100">{{ auth.user.name }}</p>
            <p class="truncate text-sm text-gray-500 dark:text-gray-400">{{ auth.user.email }}</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p class="text-xs text-gray-400">Score</p>
            <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ auth.user.score }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p class="text-xs text-gray-400">Confiance</p>
            <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ auth.user.trustScore }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p class="text-xs text-gray-400">Inscrit le</p>
            <p class="font-medium text-gray-900 dark:text-gray-100">{{ formatDate(auth.user.createdAt) }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p class="text-xs text-gray-400">Statut</p>
            <p class="font-medium" :class="auth.user.emailVerifiedAt ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">
              {{ auth.user.emailVerifiedAt ? '✓ Vérifié' : '⏳ Non vérifié' }}
            </p>
          </div>
        </div>
      </div>

      <p v-if="!auth.user.emailVerifiedAt" class="mt-3 text-sm text-amber-600 dark:text-amber-400">
        Email non confirmé — vérifie ta boîte mail.
      </p>

      <!-- Avatar -->
      <div class="mt-4">
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Choisir un avatar</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="emoji in AVATARS"
            :key="emoji"
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all"
            :class="selectedAvatar === emoji
              ? 'bg-brand-600 ring-2 ring-brand-400'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'"
            @click="selectAvatar(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <!-- Upload avatar personnalisé -->
        <div class="mt-3">
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onFileSelected" />
          <button
            type="button"
            :disabled="uploading"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            @click="triggerUpload"
          >
            📷 {{ uploading ? 'Upload en cours…' : 'Uploader ma propre photo' }}
          </button>
          <p v-if="uploadError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ uploadError }}</p>
        </div>
      </div>

      <!-- Notifications -->
      <div class="mt-4 flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Notifications email</p>
          <p class="text-xs text-gray-400">Recevoir les alertes Monstres à proximité</p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          :class="auth.user.emailNotifications ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'"
          @click="auth.setEmailNotifications(!auth.user.emailNotifications)"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="auth.user.emailNotifications ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <!-- Notifications WhatsApp -->
      <div class="mt-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Notifications WhatsApp</p>
            <p class="text-xs text-gray-400">
              {{ auth.user.phoneNumber ? 'Recevoir les alertes Monstres à proximité' : 'Renseigne un numéro pour activer' }}
            </p>
          </div>
          <button
            type="button"
            :disabled="!auth.user.phoneNumber"
            class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            :class="auth.user.whatsappNotifications ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'"
            @click="onToggleWhatsapp"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="auth.user.whatsappNotifications ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="mt-3 flex gap-2">
          <input
            v-model="phoneDraft"
            type="tel"
            placeholder="+33612345678"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            @keyup.enter="onSavePhone"
          />
          <button
            type="button"
            :disabled="savingPhone || phoneDraft.trim() === (auth.user.phoneNumber ?? '')"
            class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            @click="onSavePhone"
          >
            {{ savingPhone ? '…' : 'Sauver' }}
          </button>
        </div>
        <p class="mt-1 text-xs text-gray-400">Format international, ex. +33612345678.</p>
        <p v-if="phoneError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ phoneError }}</p>
      </div>

      <!-- Installer l'app -->
      <button
        v-if="canInstall && !installed"
        type="button"
        class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        @click="install"
      >
        📲 Installer Les Monstres sur mon téléphone
      </button>
      <p v-if="installed" class="mt-4 text-sm text-green-600 dark:text-green-400">
        ✓ L'application a été installée !
      </p>

      <!-- Liens légaux -->
      <div class="mt-6 flex flex-wrap gap-2">
        <RouterLink
          to="/mentions-legales"
          class="text-xs text-gray-400 underline decoration-gray-300 transition-colors hover:text-gray-600 dark:decoration-gray-700 dark:hover:text-gray-300"
        >
          Mentions légales
        </RouterLink>
        <RouterLink
          to="/rgpd"
          class="text-xs text-gray-400 underline decoration-gray-300 transition-colors hover:text-gray-600 dark:decoration-gray-700 dark:hover:text-gray-300"
        >
          Politique de confidentialité (RGPD)
        </RouterLink>
        <RouterLink
          to="/suppression-donnees"
          class="text-xs text-gray-400 underline decoration-gray-300 transition-colors hover:text-gray-600 dark:decoration-gray-700 dark:hover:text-gray-300"
        >
          Suppression des données
        </RouterLink>
      </div>

      <!-- Déconnexion -->
      <button
        class="mt-6 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        @click="auth.logout(); $router.push('/')"
      >
        Se déconnecter
      </button>

      <!-- Suppression de compte (§9 RGPD) -->
      <button
        type="button"
        :disabled="deleting"
        class="mt-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        @click="onDeleteAccount"
      >
        {{ deleting ? 'Suppression…' : 'Supprimer mon compte' }}
      </button>
      <p v-if="deleteError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ deleteError }}</p>
    </template>

    <div v-else class="mt-4 flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
      <p>Connecte-toi pour accéder à ton profil.</p>
      <RouterLink to="/connexion" class="text-brand-600 dark:text-brand-400">Se connecter</RouterLink>
      <RouterLink to="/inscription" class="text-brand-600 dark:text-brand-400">Créer un compte</RouterLink>
    </div>
  </section>
</template>
