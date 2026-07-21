<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fetchNotifications, markNotificationAsRead, type AppNotification } from '@/services/notifications'
import {
  fetchSubscriptions,
  createSubscription,
  deleteSubscription,
  type Subscription,
} from '@/services/subscriptions'
import { formatRelativeTime } from '@/utils/time'

const MAX_SUBSCRIPTIONS = 5
const MAX_RADIUS_KM = 5

const auth = useAuthStore()
const notifications = ref<AppNotification[]>([])
const loading = ref(true)

const subscriptions = ref<Subscription[]>([])
const subsLoading = ref(true)
const showSubForm = ref(false)
const subName = ref('')
const subRadiusKm = ref(1)
const subLat = ref<number | null>(null)
const subLng = ref<number | null>(null)
const locating = ref(false)
const subError = ref<string | null>(null)
const creatingSub = ref(false)

onMounted(async () => {
  if (auth.isAuthenticated) {
    notifications.value = await fetchNotifications()
    subscriptions.value = await fetchSubscriptions()
  }
  loading.value = false
  subsLoading.value = false
})

function label(notification: AppNotification): string {
  switch (notification.type) {
    case 'RESERVATION_CREATED':
      return `${notification.data.reserverName} a réservé « ${notification.data.itemTitle} »`
    case 'ITEM_COLLECTED':
      return `${notification.data.collectorName} a récupéré « ${notification.data.itemTitle} »`
    case 'NEW_ITEM_NEARBY':
      return `Nouveau Monstre près de chez toi : « ${notification.data.itemTitle} »`
    case 'BADGE_UNLOCKED':
      return `Badge débloqué : ${notification.data.badgeName}`
    default:
      return 'Notification'
  }
}

async function onOpen(notification: AppNotification) {
  if (!notification.readAt) {
    notification.readAt = new Date().toISOString()
    await markNotificationAsRead(notification.id)
  }
}

async function toggleEmailNotifications(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  await auth.setEmailNotifications(checked)
}

const canAddSubscription = computed(() => subscriptions.value.length < MAX_SUBSCRIPTIONS)

function locateMe() {
  if (!navigator.geolocation) return
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      subLat.value = position.coords.latitude
      subLng.value = position.coords.longitude
      locating.value = false
    },
    () => {
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}

async function handleCreateSubscription() {
  if (!subName.value.trim() || subLat.value === null || subLng.value === null) return
  creatingSub.value = true
  subError.value = null
  try {
    const subscription = await createSubscription({
      name: subName.value.trim(),
      latitude: subLat.value,
      longitude: subLng.value,
      radius: Math.round(subRadiusKm.value * 1000),
    })
    subscriptions.value.unshift(subscription)
    subName.value = ''
    subLat.value = null
    subLng.value = null
    subRadiusKm.value = 1
    showSubForm.value = false
  } catch (e: any) {
    subError.value = e.response?.data?.error?.message ?? "Impossible d'ajouter cette zone."
  } finally {
    creatingSub.value = false
  }
}

async function handleDeleteSubscription(id: string) {
  await deleteSubscription(id)
  subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Alertes</h1>

    <div v-if="!auth.isAuthenticated" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      <RouterLink to="/connexion" class="text-violet-600 underline dark:text-violet-400">Connecte-toi</RouterLink>
      pour voir tes notifications et zones surveillées.
    </div>

    <template v-else>
      <label class="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          :checked="auth.user?.emailNotifications"
          class="h-4 w-4 rounded"
          @change="toggleEmailNotifications"
        />
        Recevoir les notifications par email
      </label>

      <!-- Zones surveillées (§6.10) -->
      <div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Zones surveillées ({{ subscriptions.length }}/{{ MAX_SUBSCRIPTIONS }})
          </h2>
          <button
            v-if="canAddSubscription"
            type="button"
            class="text-sm text-violet-600 dark:text-violet-400"
            @click="showSubForm = !showSubForm"
          >
            {{ showSubForm ? 'Annuler' : '+ Ajouter' }}
          </button>
        </div>

        <p v-if="subsLoading" class="mt-2 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

        <ul v-else class="mt-3 flex flex-col gap-2">
          <li
            v-for="subscription in subscriptions"
            :key="subscription.id"
            class="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
          >
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">{{ subscription.name }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">Rayon : {{ subscription.radius / 1000 }} km</p>
            </div>
            <button
              type="button"
              class="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              @click="handleDeleteSubscription(subscription.id)"
            >
              Supprimer
            </button>
          </li>
        </ul>

        <form v-if="showSubForm" class="mt-3 flex flex-col gap-2 text-sm" @submit.prevent="handleCreateSubscription">
          <input
            v-model="subName"
            type="text"
            placeholder="Nom du lieu (ex. Chez moi)"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />

          <button
            type="button"
            class="self-start text-sm text-violet-600 dark:text-violet-400"
            :disabled="locating"
            @click="locateMe"
          >
            {{ locating ? 'Localisation…' : subLat !== null ? 'Position enregistrée ✓' : 'Utiliser ma position actuelle' }}
          </button>

          <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Rayon : {{ subRadiusKm }} km
            <input v-model.number="subRadiusKm" type="range" min="0.5" :max="MAX_RADIUS_KM" step="0.5" />
          </label>

          <p v-if="subError" class="text-xs text-red-600 dark:text-red-400">{{ subError }}</p>

          <button
            type="submit"
            :disabled="creatingSub || !subName.trim() || subLat === null"
            class="self-start rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {{ creatingSub ? 'Ajout…' : 'Ajouter cette zone' }}
          </button>
        </form>

        <p v-if="!canAddSubscription" class="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Maximum {{ MAX_SUBSCRIPTIONS }} zones — supprime-en une pour en ajouter une nouvelle.
        </p>
      </div>

      <!-- Notifications -->
      <div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>

        <p v-if="loading" class="mt-2 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
        <p v-else-if="notifications.length === 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Aucune notification pour l'instant.
        </p>

        <ul v-else class="mt-3 flex flex-col gap-2">
          <li
            v-for="notification in notifications"
            :key="notification.id"
            class="rounded-lg border text-sm"
            :class="
              notification.readAt
                ? 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400'
                : 'border-violet-300 bg-violet-50 font-medium text-gray-900 dark:border-violet-700 dark:bg-violet-950 dark:text-gray-100'
            "
          >
            <RouterLink
              v-if="notification.type === 'NEW_ITEM_NEARBY'"
              :to="`/monstres/${notification.data.itemId}`"
              class="flex items-center gap-3 p-3"
              @click="onOpen(notification)"
            >
              <img
                v-if="notification.data.itemPhotoUrl"
                :src="notification.data.itemPhotoUrl"
                alt=""
                class="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
              />
              <div class="min-w-0">
                <p class="truncate">{{ label(notification) }}</p>
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ formatRelativeTime(notification.createdAt) }}</p>
              </div>
            </RouterLink>

            <div v-else class="cursor-pointer p-3" @click="onOpen(notification)">
              <p>{{ label(notification) }}</p>
              <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ formatRelativeTime(notification.createdAt) }}</p>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
