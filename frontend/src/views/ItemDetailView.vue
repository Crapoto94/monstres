<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchItem, collectItem, type Item } from '@/services/items'
import { reserveItem, cancelReservation } from '@/services/reservations'
import { useAuthStore } from '@/stores/auth'
import { formatRelativeTime } from '@/utils/time'

const route = useRoute()
const auth = useAuthStore()
const item = ref<Item | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)
const reserving = ref(false)
const cancelling = ref(false)
const collecting = ref(false)
const reserveError = ref<string | null>(null)
const collectError = ref<string | null>(null)
const collectPreview = ref<string | null>(null)
const collectFile = ref<File | null>(null)
const now = ref(Date.now())

let timer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    item.value = await fetchItem(String(route.params.id))
  } catch {
    error.value = 'Ce Monstre est introuvable.'
  } finally {
    loading.value = false
  }
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const reservationRemaining = computed(() => {
  if (!item.value?.activeReservation) return null
  const expiresAt = new Date(item.value.activeReservation.expiresAt).getTime()
  const diff = expiresAt - now.value
  if (diff <= 0) return 'Expirée'
  const minutes = Math.floor(diff / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1000)
  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`
})

const isMyReservation = computed(() => {
  return auth.isAuthenticated && item.value?.activeReservation?.user.id === auth.user?.id
})

const isMyItem = computed(() => {
  return auth.isAuthenticated && item.value?.user.id === auth.user?.id
})

const collectionPhotos = computed(() => {
  return item.value?.photos.filter(p => p.type === 'COLLECTION') ?? []
})

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

async function handleReserve() {
  if (!item.value) return
  reserving.value = true
  reserveError.value = null
  try {
    const reservation = await reserveItem(item.value.id)
    item.value = {
      ...item.value,
      status: 'RESERVED',
      activeReservation: reservation,
    }
  } catch (e: any) {
    reserveError.value = e.response?.data?.error?.message ?? 'Impossible de réserver ce Monstre.'
  } finally {
    reserving.value = false
  }
}

async function handleCancel() {
  if (!item.value?.activeReservation) return
  cancelling.value = true
  try {
    await cancelReservation(item.value.activeReservation.id)
    item.value = {
      ...item.value,
      status: 'AVAILABLE',
      activeReservation: null,
    }
  } catch (e: any) {
    reserveError.value = e.response?.data?.error?.message ?? "Impossible d'annuler la réservation."
  } finally {
    cancelling.value = false
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
</script>

<template>
  <section class="flex-1 p-4">
    <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    <p v-else-if="error || !item" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <div v-else class="flex flex-col gap-3">
      <div class="flex gap-2 overflow-x-auto">
        <img
          v-for="photo in item.photos.filter(p => p.type !== 'COLLECTION')"
          :key="photo.id"
          :src="photo.path"
          class="h-48 w-48 flex-shrink-0 rounded-lg object-cover"
          alt=""
        />
      </div>

      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ item.title }}</h1>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        <span v-if="item.distance !== null">{{ item.distance }} km · </span>
        <span>{{ item.votesScore }} vote{{ item.votesScore > 1 ? 's' : '' }} · </span>
        <span>{{ formatRelativeTime(item.createdAt) }}</span>
      </p>

      <p v-if="item.category" class="text-sm text-gray-500 dark:text-gray-400">{{ item.category.name }}</p>

      <p v-if="item.description" class="text-gray-700 dark:text-gray-300">{{ item.description }}</p>

      <p class="text-sm text-gray-600 dark:text-gray-300">
        {{ item.address ?? `${item.latitude}, ${item.longitude}` }}
      </p>
      <p v-if="!item.address" class="text-xs text-gray-400 dark:text-gray-500">
        Connecte-toi pour voir l'adresse exacte.
      </p>

      <p class="text-sm text-gray-500 dark:text-gray-400">Publié par {{ item.user.name }}</p>

      <!-- Réservation -->
      <div v-if="item.status === 'RESERVED' && item.activeReservation" class="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
        <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
          Réservé par {{ item.activeReservation.user.name }}
        </p>
        <p class="text-xs text-amber-600 dark:text-amber-400">
          Expire dans {{ reservationRemaining }}
        </p>
        <button
          v-if="isMyReservation"
          type="button"
          :disabled="cancelling"
          class="mt-2 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900"
          @click="handleCancel"
        >
          {{ cancelling ? 'Annulation…' : 'Annuler ma réservation' }}
        </button>
      </div>

      <!-- Récupération validée -->
      <div v-if="item.status === 'COLLECTED'" class="rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-950">
        <p class="text-sm font-medium text-green-800 dark:text-green-200">
          Récupéré
          <span v-if="item.collectedAt">{{ formatRelativeTime(item.collectedAt) }}</span>
        </p>
        <div v-if="collectionPhotos.length" class="mt-2 flex gap-2">
          <img
            v-for="photo in collectionPhotos"
            :key="photo.id"
            :src="photo.path"
            class="h-24 w-24 rounded-lg object-cover"
            alt="Photo du lieu vide"
          />
        </div>
      </div>

      <!-- Réserver -->
      <button
        v-if="item.status === 'AVAILABLE' && auth.isAuthenticated && !isMyItem"
        type="button"
        :disabled="reserving"
        class="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        @click="handleReserve"
      >
        {{ reserving ? 'Réservation…' : 'Réserver ce Monstre' }}
      </button>

      <p v-if="item.status === 'AVAILABLE' && !auth.isAuthenticated" class="text-sm text-gray-500 dark:text-gray-400">
        <RouterLink to="/connexion" class="text-violet-600 underline dark:text-violet-400">Connecte-toi</RouterLink>
        pour réserver ce Monstre.
      </p>

      <!-- Valider la récupération -->
      <div v-if="item.status === 'RESERVED' && isMyReservation" class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          J'ai récupéré ce Monstre — photo du lieu vide :
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-700 hover:file:bg-green-100"
          @change="onCollectFileChange"
        />
        <img v-if="collectPreview" :src="collectPreview" class="h-32 w-32 rounded-lg object-cover" alt="Aperçu" />
        <button
          type="button"
          :disabled="!collectFile || collecting"
          class="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
          @click="handleCollect"
        >
          {{ collecting ? 'Validation…' : 'Confirmer la récupération' }}
        </button>
      </div>

      <p v-if="reserveError" class="text-sm text-red-600 dark:text-red-400">{{ reserveError }}</p>
      <p v-if="collectError" class="text-sm text-red-600 dark:text-red-400">{{ collectError }}</p>
    </div>
  </section>
</template>
