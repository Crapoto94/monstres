<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { api, type ApiSuccess } from '@/services/api'
import type { AuthUser } from '@/services/auth'
import { fetchMyItems, type MyItems, type Item } from '@/services/items'

const route = useRoute()
const router = useRouter()
const { canInstall, installed, install } = usePwaInstall()

const auth = useAuthStore()

const routeError = computed(() => {
  if (route.query.error === 'email_not_verified') {
    return "Vérifie ton adresse email avant de publier un Monstre ou de voir les positions exactes."
  }
  return null
})

const myItems = ref<MyItems | null>(null)
const myItemsTab = ref<'posted' | 'interested' | 'collected'>('posted')
const myItemsLoading = ref(false)

const currentMyItemsList = computed<Item[]>(() => {
  if (!myItems.value) return []
  return myItems.value[myItemsTab.value]
})

onMounted(async () => {
  if (!auth.isAuthenticated) return
  myItemsLoading.value = true
  try {
    myItems.value = await fetchMyItems()
  } catch {
    // silencieux
  } finally {
    myItemsLoading.value = false
  }
})

const AVATARS = [
  '😺', '🐶', '🦊', '🐻', '🐼', '🐨', '🦁', '🐮', '🐷', '🐸',
  '🐵', '🐔', '🐧', '🐦', '🦄', '🐙', '🦀', '🐳', '🌸', '🌻',
  '🍄', '⚡', '🔥', '💎', '🎯', '🚀', '🎸', '🎨', '👾', '🤖',
  '👻', '💀', '🎃', '🦊', '🦋', '🐢', '🐬', '🦜', '🐲', '🦄',
  '🌈', '🍕', '🎸', '🪐', '🏆', '🎲', '🧊', '🪺', '🧩', '🎪',
]

const selectedAvatar = computed(() => auth.user?.avatar ?? null)
const isImageAvatar = computed(() => /^(\/|https?:\/\/)/.test(selectedAvatar.value ?? ''))
const showEmojiGrid = ref(false)
const uploading = ref(false)
const uploadError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const phoneDraft = ref(auth.user?.phoneNumber ?? '')
const savingPhone = ref(false)
const phoneError = ref<string | null>(null)

// --- Crop state ---
const showCrop = ref(false)
const cropImg = ref<HTMLImageElement | null>(null)
const cropZoom = ref(1)
const cropX = ref(0)
const cropY = ref(0)
const cropDragging = ref(false)
const cropDragStart = ref({ x: 0, y: 0, imgX: 0, imgY: 0 })
const cropCanvas = ref<HTMLCanvasElement | null>(null)

function selectAvatar(emoji: string) {
  auth.setAvatar(selectedAvatar.value === emoji ? null : emoji)
}

function triggerUpload() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  const reader = new FileReader()
  reader.onload = async () => {
    const img = new Image()
    img.onload = () => {
      cropImg.value = img
      cropZoom.value = 1
      // Auto-zoom out if image is larger than 280px display to fit the face
      const fitZoom = 280 / Math.max(img.naturalWidth, img.naturalHeight)
      if (fitZoom < 1) cropZoom.value = fitZoom
      cropX.value = 0
      cropY.value = 0
      showCrop.value = true
      nextTick(() => drawCrop())
    }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
}

function onCropMouseDown(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  cropDragging.value = true
  const pos = 'touches' in e ? e.touches[0] : e
  cropDragStart.value = { x: pos.clientX, y: pos.clientY, imgX: cropX.value, imgY: cropY.value }
}

function onCropMouseMove(e: MouseEvent | TouchEvent) {
  if (!cropDragging.value) return
  const pos = 'touches' in e ? e.touches[0] : e
  const dx = pos.clientX - cropDragStart.value.x
  const dy = pos.clientY - cropDragStart.value.y
  cropX.value = cropDragStart.value.imgX + dx
  cropY.value = cropDragStart.value.imgY + dy
  drawCrop()
}

function onCropMouseUp() {
  cropDragging.value = false
}

function onCropWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  cropZoom.value = Math.max(0.2, Math.min(3, cropZoom.value + delta))
  drawCrop()
}

function onZoomInput() {
  drawCrop()
}

function drawCrop() {
  const canvas = cropCanvas.value
  const img = cropImg.value
  if (!canvas || !img) return

  const size = 280
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, size, size)

  const zoom = cropZoom.value
  const drawW = img.naturalWidth * zoom
  const drawH = img.naturalHeight * zoom
  const drawX = (size - drawW) / 2 + cropX.value
  const drawY = (size - drawH) / 2 + cropY.value

  ctx.save()
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()

  // Draw circle border
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 3
  ctx.stroke()
}

async function confirmCrop() {
  const canvas = cropCanvas.value
  const img = cropImg.value
  if (!canvas || !img) return

  // Produce a 400x400 canvas
  const outSize = 400
  const out = document.createElement('canvas')
  out.width = outSize
  out.height = outSize
  const ctx = out.getContext('2d')!
  const zoom = cropZoom.value
  const drawW = img.naturalWidth * zoom
  const drawH = img.naturalHeight * zoom
  const drawX = (outSize - drawW) / 2 + cropX.value * (outSize / 280)
  const drawY = (outSize - drawH) / 2 + cropY.value * (outSize / 280)

  ctx.save()
  ctx.beginPath()
  ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()

  const blob = await new Promise<Blob>((resolve) => out.toBlob((b) => resolve(b!), 'image/webp', 0.9))
  const file = new File([blob], 'avatar.webp', { type: 'image/webp' })

  showCrop.value = false
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
  }
}

function cancelCrop() {
  showCrop.value = false
  cropImg.value = null
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

    <p v-if="routeError" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
      {{ routeError }}
    </p>

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
          to="/tutoriel"
          class="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-900 dark:text-violet-300 dark:hover:bg-violet-800"
        >
          📖 Tutoriel
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
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Avatar</p>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            @click="showEmojiGrid = !showEmojiGrid"
          >
            🎨 Choisir un avatar
          </button>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onFileSelected" />
          <button
            type="button"
            :disabled="uploading"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            @click="triggerUpload"
          >
            📷 {{ uploading ? 'Upload en cours…' : 'Uploader ma propre photo' }}
          </button>
        </div>
        <p v-if="uploadError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ uploadError }}</p>

        <div v-if="showEmojiGrid" class="mt-2 flex flex-wrap gap-2">
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

      <!-- Notifications WhatsApp : réservées ADMIN/SUPER_ADMIN tant que l'app
           WhatsApp Business n'est pas validée par Meta (App Review) — même
           logique que la connexion Facebook, comptes admin pour les tests. -->
      <div v-if="auth.isAdmin" class="mt-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
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
      <div
        v-else
        class="mt-3 flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800"
      >
        <div>
          <p class="text-sm font-semibold text-gray-400 dark:text-gray-500">Notifications WhatsApp</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">Bientôt disponible</p>
        </div>
        <span class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed items-center rounded-full bg-gray-200 dark:bg-gray-800">
          <span class="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white" />
        </span>
      </div>

      <!-- Mes Monstres -->
      <div class="mt-4">
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Mes Monstres</p>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            :class="myItemsTab === 'posted' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
            @click="myItemsTab = 'posted'"
          >
            Publiés {{ myItems ? `(${myItems.posted.length})` : '' }}
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            :class="myItemsTab === 'interested' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
            @click="myItemsTab = 'interested'"
          >
            Intéressent {{ myItems ? `(${myItems.interested.length})` : '' }}
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            :class="myItemsTab === 'collected' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
            @click="myItemsTab = 'collected'"
          >
            Récupérés {{ myItems ? `(${myItems.collected.length})` : '' }}
          </button>
        </div>

        <p v-if="myItemsLoading" class="mt-3 text-sm text-gray-400 dark:text-gray-500">Chargement…</p>
        <ul v-else class="mt-3 flex flex-col gap-2">
          <li v-for="myItem in currentMyItemsList" :key="myItem.id">
            <RouterLink
              :to="`/monstres/${myItem.id}`"
              class="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                <img v-if="myItem.photos[0]" :src="myItem.photos[0].thumbnailPath ?? myItem.photos[0].path" class="h-full w-full object-cover" alt="" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ myItem.title }}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  <span v-if="myItem.status === 'COLLECTED'">Récupéré</span>
                  <span v-else-if="myItem.interestedCount > 0">{{ myItem.interestedCount }} intéressé{{ myItem.interestedCount > 1 ? 's' : '' }}</span>
                  <span v-else>Disponible</span>
                </p>
              </div>
            </RouterLink>
          </li>
          <li v-if="currentMyItemsList.length === 0" class="text-sm text-gray-400 dark:text-gray-500">
            Aucun Monstre ici pour l'instant.
          </li>
        </ul>
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
      <div class="mt-6 flex flex-col gap-2">
        <RouterLink
          to="/pourquoi"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          🌍 Pourquoi Les Monstres ?
        </RouterLink>
        <RouterLink
          to="/mentions-legales"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          📄 Mentions légales
        </RouterLink>
        <RouterLink
          to="/rgpd"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          🔒 Politique de confidentialité (RGPD)
        </RouterLink>
        <RouterLink
          to="/suppression-donnees"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          🗑️ Suppression des données
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

  <!-- Crop modal -->
  <Teleport to="body">
    <div
      v-if="showCrop"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
      @mousemove="onCropMouseMove"
      @mouseup="onCropMouseUp"
      @touchmove.prevent="onCropMouseMove"
      @touchend="onCropMouseUp"
    >
      <p class="mb-3 text-sm font-medium text-white">Recadre ta photo</p>

      <div
        class="relative rounded-full overflow-hidden cursor-grab active:cursor-grabbing"
        style="width: 280px; height: 280px"
        @mousedown.prevent="onCropMouseDown"
        @touchstart.prevent="onCropMouseDown"
        @wheel.prevent="onCropWheel"
      >
        <canvas ref="cropCanvas" width="280" height="280" class="block rounded-full" />
        <!-- Semi-transparent overlay outside circle -->
        <div class="pointer-events-none absolute inset-0 rounded-full ring-4 ring-white/30" />
      </div>

      <!-- Zoom slider -->
      <div class="mt-4 flex items-center gap-3 w-64">
        <span class="text-xs text-white/60">−</span>
        <input
          type="range"
          :value="cropZoom"
          min="0.2"
          max="3"
          step="0.05"
          class="flex-1 accent-brand-500"
          @input="cropZoom = Number(($event.target as HTMLInputElement).value); onZoomInput()"
        />
        <span class="text-xs text-white/60">+</span>
      </div>

      <div class="mt-4 flex gap-3">
        <button
          type="button"
          class="rounded-xl bg-white/20 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
          @click="cancelCrop"
        >
          Annuler
        </button>
        <button
          type="button"
          class="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          @click="confirmCrop"
        >
          Utiliser cette photo
        </button>
      </div>
    </div>
  </Teleport>
</template>
