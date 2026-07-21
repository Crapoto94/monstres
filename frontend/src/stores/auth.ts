import { defineStore } from 'pinia'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string | null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
  },
})
