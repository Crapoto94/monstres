import { api, type ApiSuccess } from './api'

export type NotificationType = 'NEW_ITEM_NEARBY' | 'RESERVATION_CREATED' | 'ITEM_COLLECTED' | 'BADGE_UNLOCKED'

export interface AppNotification {
  id: string
  type: NotificationType
  data: Record<string, string>
  readAt: string | null
  createdAt: string
}

export async function fetchNotifications() {
  const { data } = await api.get<ApiSuccess<AppNotification[]>>('/notifications')
  return data.data
}

export async function markNotificationAsRead(id: string) {
  await api.patch(`/notifications/${id}/read`)
}
