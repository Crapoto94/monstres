<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fetchNotifications, markNotificationAsRead, type AppNotification } from '@/services/notifications'
import { formatRelativeTime } from '@/utils/time'

const auth = useAuthStore()
const notifications = ref<AppNotification[]>([])
const loading = ref(true)

onMounted(async () => {
  if (auth.isAuthenticated) {
    notifications.value = await fetchNotifications()
  }
  loading.value = false
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
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Alertes</h1>

    <div v-if="!auth.isAuthenticated" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      <RouterLink to="/connexion" class="text-violet-600 underline dark:text-violet-400">Connecte-toi</RouterLink>
      pour voir tes notifications.
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

      <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      <p v-else-if="notifications.length === 0" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Aucune notification pour l'instant.
      </p>

      <ul v-else class="mt-4 flex flex-col gap-2">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          class="cursor-pointer rounded-lg border p-3 text-sm"
          :class="
            notification.readAt
              ? 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400'
              : 'border-violet-300 bg-violet-50 font-medium text-gray-900 dark:border-violet-700 dark:bg-violet-950 dark:text-gray-100'
          "
          @click="onOpen(notification)"
        >
          <p>{{ label(notification) }}</p>
          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ formatRelativeTime(notification.createdAt) }}</p>
        </li>
      </ul>
    </template>
  </section>
</template>
