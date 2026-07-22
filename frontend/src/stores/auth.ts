import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import * as authService from '@/services/auth'
import type { AuthUser } from '@/services/auth'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && error.response?.data?.error?.message) {
    return error.response.data.error.message as string
  }
  return fallback
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    initialized: false,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
    isAdmin: (state) => state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN',
    isModerator: (state) =>
      state.user?.role === 'MODERATOR' || state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN',
  },
  actions: {
    /** À appeler une fois au démarrage de l'app pour restaurer la session via le cookie. */
    async init() {
      if (this.initialized) return
      try {
        this.user = await authService.fetchMe()
      } catch {
        this.user = null
      } finally {
        this.initialized = true
      }
    },

    async register(payload: { name: string; email: string; password: string; confirmPassword: string }) {
      this.loading = true
      this.error = null
      try {
        this.user = await authService.register(payload)
      } catch (error) {
        this.error = extractErrorMessage(error, "L'inscription a échoué.")
        throw error
      } finally {
        this.loading = false
      }
    },

    async login(payload: { email: string; password: string }) {
      this.loading = true
      this.error = null
      try {
        this.user = await authService.login(payload)
      } catch (error) {
        this.error = extractErrorMessage(error, 'Email ou mot de passe incorrect.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      await authService.logout()
      this.user = null
    },

    async setEmailNotifications(enabled: boolean) {
      this.user = await authService.updateEmailNotifications(enabled)
    },

    async setAvatar(avatar: string | null) {
      this.user = await authService.updateAvatar(avatar)
    },
  },
})
