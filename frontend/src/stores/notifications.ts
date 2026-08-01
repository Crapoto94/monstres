import { defineStore } from 'pinia'
import { fetchUnreadCount } from '@/services/notifications'
import { useAuthStore } from './auth'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    unreadCount: 0 as number,
  }),
  actions: {
    async refreshUnreadCount() {
      const auth = useAuthStore()
      if (!auth.isAuthenticated) {
        this.unreadCount = 0
        return
      }
      try {
        this.unreadCount = await fetchUnreadCount()
      } catch {
        this.unreadCount = 0
      }
    },
  },
})
