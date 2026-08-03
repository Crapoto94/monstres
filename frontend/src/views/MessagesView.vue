<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import {
  createConversation,
  fetchConversations,
  fetchMessages,
  fetchSupportRecipient,
  markConversationRead,
  sendMessage,
  type ConversationSummary,
  type Message,
} from '@/services/messages'
import { formatRelativeTime } from '@/utils/time'
import SmileyPicker from '@/components/SmileyPicker.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const messagesStore = useMessagesStore()

const conversations = ref<ConversationSummary[]>([])
const loading = ref(true)
const activeConversationId = ref<string | null>(null)
const messages = ref<Message[]>([])
const messagesLoading = ref(false)
const draft = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const draftInput = ref<HTMLTextAreaElement | null>(null)
const showSmileys = ref(false)
const contactingSupport = ref(false)

const activeConversation = computed(() => conversations.value.find((c) => c.id === activeConversationId.value) ?? null)

// Rempli juste après la création d'une conversation (openWithRecipient) : le
// temps que `conversations` soit rechargée, `activeConversation` ne connaît
// pas encore ce destinataire — sans ce filet, l'en-tête resterait vide.
const pendingRecipient = ref<{ conversationId: string; id: string; name: string; avatar: string | null } | null>(null)

const otherUser = computed(() => {
  const conv = activeConversation.value
  if (conv) return { id: conv.otherUser.id, name: conv.otherUser.name, avatar: conv.otherUser.avatar }
  if (pendingRecipient.value && pendingRecipient.value.conversationId === activeConversationId.value) {
    return pendingRecipient.value
  }
  const recipientId = typeof route.query.recipient === 'string' ? route.query.recipient : null
  const recipientName = typeof route.query.recipientName === 'string' ? route.query.recipientName : null
  if (recipientId) return { id: recipientId, name: recipientName ?? '…', avatar: null }
  return null
})

const threadEl = ref<HTMLElement | null>(null)

async function loadConversations() {
  try {
    conversations.value = await fetchConversations()
    await messagesStore.refreshUnreadCount()
  } catch {
    error.value = 'Impossible de charger les conversations.'
  } finally {
    loading.value = false
  }
}

async function scrollToBottom() {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
}

async function openConversation(id: string, markRead = true) {
  activeConversationId.value = id
  messagesLoading.value = true
  error.value = null
  try {
    messages.value = await fetchMessages(id)
    if (markRead) await markConversationRead(id)
    const conv = conversations.value.find((c) => c.id === id)
    if (conv) conv.unreadCount = 0
    await messagesStore.refreshUnreadCount()
    await scrollToBottom()
  } catch {
    error.value = 'Impossible de charger les messages.'
  } finally {
    messagesLoading.value = false
  }
}

async function openWithRecipient(recipientId: string) {
  messagesLoading.value = true
  error.value = null
  try {
    const conv = await createConversation(recipientId)
    pendingRecipient.value = { conversationId: conv.id, id: conv.recipient.id, name: conv.recipient.name, avatar: null }
    // Positionne d'abord l'id actif pour que le watcher sur
    // route.query.conversation (déclenché par replace ci-dessous) ne
    // refasse pas un chargement en double.
    activeConversationId.value = conv.id
    router.replace({ path: '/messages', query: { conversation: conv.id } })
    await openConversation(conv.id, false)
  } catch {
    error.value = "Impossible d'ouvrir la conversation."
  } finally {
    messagesLoading.value = false
  }
}

async function onWriteToMonstre() {
  if (contactingSupport.value) return
  contactingSupport.value = true
  error.value = null
  try {
    const support = await fetchSupportRecipient()
    await openWithRecipient(support.id)
  } catch {
    error.value = "Impossible de contacter l'équipe pour l'instant."
  } finally {
    contactingSupport.value = false
  }
}

async function backToList() {
  activeConversationId.value = null
  messages.value = []
  router.replace({ path: '/messages' })
  await loadConversations()
}

async function onSend() {
  const content = draft.value.trim()
  if (!content || !activeConversationId.value || sending.value) return
  sending.value = true
  try {
    const msg = await sendMessage(activeConversationId.value, content)
    messages.value.push(msg)
    draft.value = ''
    await scrollToBottom()
    const conv = activeConversation.value
    if (conv) {
      conv.lastMessage = { content, createdAt: msg.createdAt, fromMe: true }
      conv.lastMessageAt = msg.createdAt
    }
  } catch {
    error.value = "Impossible d'envoyer le message."
  } finally {
    sending.value = false
  }
}

function insertEmoji(emoji: string) {
  const start = draftInput.value?.selectionStart ?? draft.value.length
  const end = draftInput.value?.selectionEnd ?? draft.value.length
  draft.value = draft.value.slice(0, start) + emoji + draft.value.slice(end)
  showSmileys.value = false
  nextTick(() => {
    draftInput.value?.focus()
    draftInput.value?.setSelectionRange(start + emoji.length, start + emoji.length)
  })
}

function avatarFor(user: { avatar: string | null; name: string } | null): string {
  return user?.avatar ?? user?.name?.charAt(0).toUpperCase() ?? '?'
}

function isImageAvatar(avatar: string | null): boolean {
  return !!avatar && /^(\/|https?:\/\/)/.test(avatar)
}

onMounted(async () => {
  await loadConversations()
  const conversationId = typeof route.query.conversation === 'string' ? route.query.conversation : null
  const recipientId = typeof route.query.recipient === 'string' ? route.query.recipient : null
  if (conversationId) {
    await openConversation(conversationId)
  } else if (recipientId && recipientId !== auth.user?.id) {
    await openWithRecipient(recipientId)
  }
})

watch(
  () => route.query.conversation,
  (value) => {
    if (typeof value === 'string' && value !== activeConversationId.value) {
      openConversation(value)
    }
  },
)
</script>

<template>
  <section class="flex flex-1 flex-col p-4 pb-24">
    <template v-if="!activeConversationId">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Messages</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Discute en privé avec les autres membres de la communauté.
          </p>
        </div>
        <button
          type="button"
          :disabled="contactingSupport"
          class="flex-shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
          @click="onWriteToMonstre"
        >
          👾 {{ contactingSupport ? '…' : 'Écrire au Monstre' }}
        </button>
      </div>

      <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      <p v-else-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-else-if="conversations.length === 0" class="mt-4 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Aucune conversation pour l'instant. Écris à un déposant depuis la fiche d'un Monstre, ou à un membre de la communauté.
      </p>

      <ul v-else class="mt-4 flex flex-col gap-2">
        <li v-for="conv in conversations" :key="conv.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
            @click="openConversation(conv.id)"
          >
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
              :class="isImageAvatar(conv.otherUser.avatar) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'"
            >
              <img v-if="isImageAvatar(conv.otherUser.avatar)" :src="conv.otherUser.avatar!" class="h-10 w-10 rounded-full object-cover" alt="" />
              <span v-else>{{ avatarFor(conv.otherUser) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ conv.otherUser.name }}</p>
                <span v-if="conv.lastMessageAt" class="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                  {{ formatRelativeTime(conv.lastMessageAt) }}
                </span>
              </div>
              <p class="truncate text-sm text-gray-500 dark:text-gray-400">
                <span v-if="conv.lastMessage" class="text-gray-400 dark:text-gray-500">{{ conv.lastMessage.fromMe ? 'Vous : ' : '' }}</span>
                {{ conv.lastMessage?.content ?? 'Aucun message' }}
              </p>
            </div>
            <span
              v-if="conv.unreadCount > 0"
              class="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white"
            >
              {{ conv.unreadCount }}
            </span>
          </button>
        </li>
      </ul>
    </template>

    <template v-else>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex-shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title="Retour"
          @click="backToList"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5"><path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
          :class="isImageAvatar(otherUser?.avatar ?? null) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'"
        >
          <img v-if="isImageAvatar(otherUser?.avatar ?? null)" :src="otherUser!.avatar!" class="h-9 w-9 rounded-full object-cover" alt="" />
          <span v-else>{{ avatarFor(otherUser) }}</span>
        </div>
        <h1 class="min-w-0 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">{{ otherUser?.name }}</h1>
      </div>

      <p v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ error }}</p>

      <div
        ref="threadEl"
        class="mt-3 flex max-h-[calc(100vh-20rem)] min-h-48 flex-col gap-2 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      >
        <p v-if="messagesLoading" class="text-center text-sm text-gray-400 dark:text-gray-500">Chargement…</p>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="msg.fromMe ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
            :class="msg.fromMe
              ? 'rounded-br-sm bg-brand-600 text-white'
              : 'rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'"
          >
            <p class="break-words whitespace-pre-wrap">{{ msg.content }}</p>
            <p class="mt-0.5 text-right text-[10px]" :class="msg.fromMe ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'">
              {{ formatRelativeTime(msg.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <div v-if="showSmileys" class="mb-2">
          <SmileyPicker @select="insertEmoji" />
        </div>
        <div class="flex items-end gap-2">
          <button
            type="button"
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-300 text-lg transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            :class="showSmileys ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'"
            title="Ajouter un smiley"
            @click="showSmileys = !showSmileys"
          >
            😊
          </button>
          <textarea
            ref="draftInput"
            v-model="draft"
            rows="1"
            maxlength="2000"
            placeholder="Écris ton message…"
            class="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
            @keydown.enter.exact.prevent="onSend"
          />
          <button
            type="button"
            :disabled="!draft.trim() || sending"
            class="flex-shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
            @click="onSend"
          >
            {{ sending ? '…' : 'Envoyer' }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
