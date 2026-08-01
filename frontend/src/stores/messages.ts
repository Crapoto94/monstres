import { defineStore } from 'pinia'
import { fetchUnreadCount } from '@/services/messages'
import { useAuthStore } from './auth'

export const useMessagesStore = defineStore('messages', {
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
