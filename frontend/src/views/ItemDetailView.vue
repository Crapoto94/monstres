<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchItem, collectItem, toggleVote, reportItem, type Item, type ReportType } from '@/services/items'
import { toggleInterest } from '@/services/reservations'
import { fetchComments, createComment, deleteComment, type Comment } from '@/services/comments'
import { useAuthStore } from '@/stores/auth'
import { formatRelativeTime } from '@/utils/time'

const route = useRoute()
const auth = useAuthStore()
const item = ref<Item | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)
const togglingInterest = ref(false)
const collecting = ref(false)
const interestError = ref<string | null>(null)
const collectError = ref<string | null>(null)
const collectPreview = ref<string | null>(null)
const collectFile = ref<File | null>(null)
const voting = ref(false)
const voted = ref(false)
const comments = ref<Comment[]>([])
const commentContent = ref('')
const postingComment = ref(false)
const commentError = ref<string | null>(null)
const lightboxSrc = ref<string | null>(null)
const galleryEl = ref<HTMLElement | null>(null)
const activePhoto = ref(0)

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'ALREADY_COLLECTED', label: 'Déjà récupéré / plus disponible' },
  { value: 'FAKE', label: 'Faux Monstre (photo trompeuse / objet absent)' },
  { value: 'WRONG_LOCATION', label: 'Mauvaise localisation' },
  { value: 'DUPLICATE', label: 'Doublon (déjà publié)' },
  { value: 'INAPPROPRIATE', label: 'Contenu inapproprié' },
]
const showReportForm = ref(false)
const reportType = ref<ReportType>('ALREADY_COLLECTED')
const reportReason = ref('')
const reporting = ref(false)
const reportError = ref<string | null>(null)
const reported = ref(false)

onMounted(async () => {
  try {
    item.value = await fetchItem(String(route.params.id))
    voted.value = item.value.hasVoted
    reported.value = item.value.hasReported
    comments.value = await fetchComments(String(route.params.id))
  } catch {
    error.value = 'Ce Monstre est introuvable.'
  } finally {
    loading.value = false
  }
})

const isMyItem = computed(() => {
  return auth.isAuthenticated && item.value?.user.id === auth.user?.id
})

const listingPhotos = computed(() => {
  return item.value?.photos.filter(p => p.type !== 'COLLECTION') ?? []
})

const collectionPhotos = computed(() => {
  return item.value?.photos.filter(p => p.type === 'COLLECTION') ?? []
})

function isImageAvatar(avatar: string | null | undefined): boolean {
  return !!avatar && /^(\/|https?:\/\/)/.test(avatar)
}

function onGalleryScroll() {
  const el = galleryEl.value
  if (!el || el.clientWidth === 0) return
  activePhoto.value = Math.round(el.scrollLeft / el.clientWidth)
}

function onCollectFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  collectFile.value = file
  if (file) {
    collectPreview.value = URL.createObjectURL(file)
  } else {
    collectPreview.value = null
  }
}

async function handleToggleInterest() {
  if (!item.value) return
  togglingInterest.value = true
  interestError.value = null
  try {
    const result = await toggleInterest(item.value.id)
    item.value = {
      ...item.value,
      isInterested: result.interested,
      interestedCount: result.interestedCount,
    }
  } catch (e: any) {
    interestError.value = e.response?.data?.error?.message ?? "Impossible de mettre à jour ton intérêt."
  } finally {
    togglingInterest.value = false
  }
}

async function handleCollect() {
  if (!item.value || !collectFile.value) return
  collecting.value = true
  collectError.value = null
  try {
    const updated = await collectItem(item.value.id, collectFile.value)
    item.value = updated
    collectPreview.value = null
    collectFile.value = null
  } catch (e: any) {
    collectError.value = e.response?.data?.error?.message ?? 'Impossible de valider la récupération.'
  } finally {
    collecting.value = false
  }
}

async function handleVote() {
  if (!item.value) return
  voting.value = true
  try {
    const result = await toggleVote(item.value.id)
    voted.value = result.voted
    item.value = { ...item.value, votesScore: result.votesScore }
  } catch {
    // silencieux : le bouton reste dans son état précédent
  } finally {
    voting.value = false
  }
}

async function handleReport() {
  if (!item.value) return
  reporting.value = true
  reportError.value = null
  try {
    await reportItem(item.value.id, { type: reportType.value, reason: reportReason.value.trim() || undefined })
    reported.value = true
    showReportForm.value = false
  } catch (e: any) {
    if (e.response?.status === 409) {
      reported.value = true
      showReportForm.value = false
    } else {
      reportError.value = e.response?.data?.error?.message ?? 'Impossible d\'envoyer ce signalement.'
    }
  } finally {
    reporting.value = false
  }
}

async function handlePostComment() {
  if (!item.value || !commentContent.value.trim()) return
  postingComment.value = true
  commentError.value = null
  try {
    const comment = await createComment(item.value.id, commentContent.value.trim())
    comments.value.push(comment)
    commentContent.value = ''
  } catch (e: any) {
    commentError.value = e.response?.data?.error?.message ?? "Impossible d'envoyer le commentaire."
  } finally {
    postingComment.value = false
  }
}

function canDeleteComment(comment: Comment): boolean {
  if (!auth.isAuthenticated) return false
  return comment.user.id === auth.user?.id || auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN'
}

async function handleDeleteComment(comment: Comment) {
  if (!item.value) return
  try {
    await deleteComment(item.value.id, comment.id)
    comments.value = comments.value.filter((c) => c.id !== comment.id)
  } catch {
    // silencieux
  }
}
</script>

<template>
  <section class="flex-1">
    <p v-if="loading" class="p-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    <p v-else-if="error || !item" class="p-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <div v-else class="flex flex-col">
      <!-- Galerie photo -->
      <div class="relative">
        <RouterLink
          to="/"
          class="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5"><path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </RouterLink>

        <button
          v-if="auth.isAuthenticated && !isMyItem"
          type="button"
          :disabled="voting"
          class="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors disabled:opacity-40"
          :class="voted ? 'bg-brand-600 text-white' : 'bg-black/40 text-white hover:bg-black/60'"
          @click="handleVote"
        >
          ★ {{ item.votesScore }}
        </button>
        <span v-else class="absolute right-3 top-3 z-10 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          ★ {{ item.votesScore }}
        </span>

        <div
          ref="galleryEl"
          class="flex snap-x snap-mandatory overflow-x-auto scroll-smooth bg-gray-100 dark:bg-gray-800"
          style="scrollbar-width: none;"
          @scroll="onGalleryScroll"
        >
          <img
            v-for="photo in listingPhotos"
            :key="photo.id"
            :src="photo.path"
            class="aspect-square w-full flex-shrink-0 cursor-zoom-in snap-center object-cover"
            alt=""
            @click="lightboxSrc = photo.path"
          />
        </div>

        <div v-if="listingPhotos.length > 1" class="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          <span
            v-for="(photo, index) in listingPhotos"
            :key="photo.id"
            class="h-1.5 w-1.5 rounded-full transition-all"
            :class="index === activePhoto ? 'w-4 bg-white' : 'bg-white/50'"
          />
        </div>
      </div>

      <div class="flex flex-col gap-4 p-4">
        <!-- Titre + badges -->
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="item.category"
              class="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/60 dark:text-brand-200"
            >
              {{ item.category.name }}
            </span>
            <span
              v-if="item.status === 'AVAILABLE' && item.interestedCount > 0"
              class="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            >
              🔥 {{ item.interestedCount }} intéressé{{ item.interestedCount > 1 ? 's' : '' }}
            </span>
            <span
              v-if="item.status === 'COLLECTED'"
              class="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300"
            >
              ✓ Récupéré
            </span>
          </div>
          <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{{ item.title }}</h1>
          <p class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="item.distance !== null">📍 {{ item.distance }} km</span>
            <span>🕐 {{ formatRelativeTime(item.createdAt) }}</span>
          </p>
        </div>

        <!-- Déposant -->
        <div class="flex items-center gap-2.5 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800">
          <div
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base"
            :class="isImageAvatar(item.user.avatar) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'"
          >
            <img v-if="isImageAvatar(item.user.avatar)" :src="item.user.avatar!" class="h-9 w-9 rounded-full object-cover" alt="" />
            <span v-else>{{ item.user.avatar ?? item.user.name.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ item.user.name }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">a publié ce Monstre</p>
          </div>
        </div>

        <!-- Description -->
        <p v-if="item.description" class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{{ item.description }}</p>

        <!-- Adresse -->
        <div class="flex items-start gap-2 text-sm">
          <span class="mt-0.5">📍</span>
          <span v-if="item.address" class="text-gray-700 dark:text-gray-300">{{ item.address }}</span>
          <span v-else class="text-gray-400 dark:text-gray-500">Adresse non renseignée.</span>
        </div>

        <!-- Récupération validée -->
        <div v-if="item.status === 'COLLECTED'" class="rounded-xl border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-950">
          <p class="text-sm font-medium text-green-800 dark:text-green-200">
            ✓ Récupéré
            <span v-if="item.collectedAt" class="font-normal text-green-700 dark:text-green-300">{{ formatRelativeTime(item.collectedAt) }}</span>
          </p>
          <div v-if="collectionPhotos.length" class="mt-2 flex gap-2">
            <img
              v-for="photo in collectionPhotos"
              :key="photo.id"
              :src="photo.path"
              class="h-20 w-20 cursor-zoom-in rounded-lg object-cover"
              alt="Photo du lieu vide"
              @click="lightboxSrc = photo.path"
            />
          </div>
        </div>

        <!-- Je suis intéressé -->
        <button
          v-if="item.status === 'AVAILABLE' && auth.isAuthenticated && !isMyItem"
          type="button"
          :disabled="togglingInterest"
          class="w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-colors disabled:opacity-40"
          :class="
            item.isInterested
              ? 'border-2 border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-300'
              : 'bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700'
          "
          @click="handleToggleInterest"
        >
          {{ togglingInterest ? '…' : (item.isInterested ? '✓ Tu es intéressé(e)' : 'Je suis intéressé(e)') }}
        </button>

        <p v-if="item.status === 'AVAILABLE' && !auth.isAuthenticated" class="rounded-xl bg-gray-50 p-3 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <RouterLink to="/connexion" class="font-medium text-brand-600 underline dark:text-brand-400">Connecte-toi</RouterLink>
          pour te déclarer intéressé(e) par ce Monstre.
        </p>

        <!-- Valider la récupération -->
        <div v-if="item.status === 'AVAILABLE' && item.isInterested" class="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
            📦 J'ai récupéré ce Monstre — photo du lieu vide :
          </p>
          <div class="flex items-center gap-3">
            <div
              class="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
            >
              <img v-if="collectPreview" :src="collectPreview" class="h-full w-full object-cover" alt="Aperçu" />
              <span v-else class="text-xs text-gray-400 dark:text-gray-500">📷</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="absolute inset-0 cursor-pointer opacity-0"
                @change="onCollectFileChange"
              />
            </div>
            <button
              type="button"
              :disabled="!collectFile || collecting"
              class="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
              @click="handleCollect"
            >
              {{ collecting ? 'Validation…' : 'Confirmer la récupération' }}
            </button>
          </div>
        </div>

        <p v-if="interestError" class="text-sm text-red-600 dark:text-red-400">{{ interestError }}</p>
        <p v-if="collectError" class="text-sm text-red-600 dark:text-red-400">{{ collectError }}</p>

        <!-- Signalement -->
        <div v-if="auth.isAuthenticated && !isMyItem" class="text-sm">
          <p v-if="reported" class="text-xs text-gray-400 dark:text-gray-500">⚠ Signalement envoyé, merci.</p>
          <button
            v-else-if="!showReportForm"
            type="button"
            class="text-xs font-medium text-gray-400 underline decoration-gray-300 transition-colors hover:text-red-600 dark:decoration-gray-700 dark:hover:text-red-400"
            @click="showReportForm = true"
          >
            ⚠ Signaler ce Monstre
          </button>

          <form v-else class="mt-2 flex flex-col gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800" @submit.prevent="handleReport">
            <select
              v-model="reportType"
              class="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option v-for="option in REPORT_TYPES" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <textarea
              v-model="reportReason"
              maxlength="500"
              rows="2"
              placeholder="Précision (optionnel)"
              class="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            ></textarea>
            <p v-if="reportError" class="text-xs text-red-600 dark:text-red-400">{{ reportError }}</p>
            <div class="flex gap-2">
              <button
                type="submit"
                :disabled="reporting"
                class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {{ reporting ? 'Envoi…' : 'Envoyer le signalement' }}
              </button>
              <button type="button" class="text-xs text-gray-500 dark:text-gray-400" @click="showReportForm = false">
                Annuler
              </button>
            </div>
          </form>
        </div>

        <!-- Commentaires -->
        <div class="mt-2 border-t border-gray-200 pt-4 dark:border-gray-800">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            💬 Commentaires ({{ comments.length }})
          </h2>

          <ul class="mt-3 flex flex-col gap-3">
            <li v-for="comment in comments" :key="comment.id" class="flex items-start gap-2.5">
              <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm"
                :class="isImageAvatar(comment.user.avatar) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'"
              >
                <img v-if="isImageAvatar(comment.user.avatar)" :src="comment.user.avatar!" class="h-8 w-8 rounded-full object-cover" alt="" />
                <span v-else>{{ comment.user.avatar ?? comment.user.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs">
                    <span class="font-semibold text-gray-900 dark:text-gray-100">{{ comment.user.name }}</span>
                    <span class="text-gray-400 dark:text-gray-500"> · {{ formatRelativeTime(comment.createdAt) }}</span>
                  </p>
                  <button
                    v-if="canDeleteComment(comment)"
                    type="button"
                    class="flex-shrink-0 text-[11px] text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    @click="handleDeleteComment(comment)"
                  >
                    Supprimer
                  </button>
                </div>
                <p class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{{ comment.content }}</p>
              </div>
            </li>
            <li v-if="comments.length === 0" class="text-sm text-gray-400 dark:text-gray-500">
              Aucun commentaire pour l'instant.
            </li>
          </ul>

          <form v-if="auth.isAuthenticated" class="mt-3 flex gap-2" @submit.prevent="handlePostComment">
            <input
              v-model="commentContent"
              type="text"
              maxlength="500"
              placeholder="Je passe ce soir…"
              class="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              type="submit"
              :disabled="postingComment || !commentContent.trim()"
              class="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Envoyer
            </button>
          </form>
          <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <RouterLink to="/connexion" class="text-brand-600 underline dark:text-brand-400">Connecte-toi</RouterLink>
            pour commenter.
          </p>
          <p v-if="commentError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ commentError }}</p>
        </div>
      </div>
    </div>

    <!-- Lightbox : agrandir la photo -->
    <Teleport to="body">
      <div
        v-if="lightboxSrc"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        @click="lightboxSrc = null"
      >
        <button
          type="button"
          class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
          @click="lightboxSrc = null"
        >
          ×
        </button>
        <img :src="lightboxSrc" class="max-h-full max-w-full rounded-lg object-contain" alt="" @click.stop />
      </div>
    </Teleport>
  </section>
</template>
