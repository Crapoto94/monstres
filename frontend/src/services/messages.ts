import { api, type ApiSuccess } from './api'

export interface ConversationOtherUser {
  id: string
  name: string
  avatar: string | null
}

export interface ConversationSummary {
  id: string
  otherUser: ConversationOtherUser
  lastMessage: {
    content: string
    createdAt: string
    fromMe: boolean
  } | null
  unreadCount: number
  lastMessageAt: string | null
}

export interface Message {
  id: string
  content: string
  createdAt: string
  senderId?: string
  readAt?: string | null
  fromMe: boolean
}

export interface NewConversation {
  id: string
  recipient: ConversationOtherUser
}

export async function fetchConversations() {
  const { data } = await api.get<ApiSuccess<ConversationSummary[]>>('/messages/conversations')
  return data.data
}

export async function fetchMessages(conversationId: string) {
  const { data } = await api.get<ApiSuccess<Message[]>>(`/messages/conversations/${conversationId}/messages`)
  return data.data
}

export async function sendMessage(conversationId: string, content: string) {
  const { data } = await api.post<ApiSuccess<Message>>(`/messages/conversations/${conversationId}/messages`, { content })
  return data.data
}

export async function createConversation(recipientId: string) {
  const { data } = await api.post<ApiSuccess<NewConversation>>('/messages/conversations', { recipientId })
  return data.data
}

export async function markConversationRead(conversationId: string) {
  const { data } = await api.patch<ApiSuccess<{ read: boolean }>>(`/messages/conversations/${conversationId}/read`)
  return data.data
}

export async function fetchUnreadCount() {
  const { data } = await api.get<ApiSuccess<{ count: number }>>('/messages/unread-count')
  return data.data.count
}

export async function fetchSupportRecipient() {
  const { data } = await api.get<ApiSuccess<{ id: string; name: string }>>('/messages/support-recipient')
  return data.data
}
