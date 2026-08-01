<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MessagesView from './MessagesView.vue'
import AlertsView from './AlertsView.vue'
import { useMessagesStore } from '@/stores/messages'
import { useNotificationsStore } from '@/stores/notifications'

const route = useRoute()
const router = useRouter()
const messagesStore = useMessagesStore()
const notificationsStore = useNotificationsStore()

const tab = ref<'messages' | 'alertes'>(route.query.tab === 'alertes' ? 'alertes' : 'messages')

function switchTab(next: 'messages' | 'alertes') {
  tab.value = next
  router.replace({ path: '/messages', query: next === 'alertes' ? { tab: 'alertes' } : {} })
}

watch(
  () => route.query.tab,
  (value) => {
    tab.value = value === 'alertes' ? 'alertes' : 'messages'
  },
)
</script>

<template>
  <section class="flex flex-1 flex-col">
    <div class="sticky top-0 z-10 flex items-center gap-1 border-b border-gray-200 bg-white/95 px-4 pt-3 pb-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
        :class="tab === 'messages'
          ? 'bg-brand-600 text-white'
          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
        @click="switchTab('messages')"
      >
        Messages
        <span
          v-if="messagesStore.unreadCount > 0"
          class="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
          :class="tab === 'messages' ? 'bg-white/25 text-white' : 'bg-brand-600 text-white'"
        >
          {{ messagesStore.unreadCount > 99 ? '99+' : messagesStore.unreadCount }}
        </span>
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
        :class="tab === 'alertes'
          ? 'bg-brand-600 text-white'
          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
        @click="switchTab('alertes')"
      >
        Alertes
        <span
          v-if="notificationsStore.unreadCount > 0"
          class="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
          :class="tab === 'alertes' ? 'bg-white/25 text-white' : 'bg-brand-600 text-white'"
        >
          {{ notificationsStore.unreadCount > 99 ? '99+' : notificationsStore.unreadCount }}
        </span>
      </button>
    </div>

    <MessagesView v-if="tab === 'messages'" class="flex-1" />
    <AlertsView v-else class="flex-1" />
  </section>
</template>
