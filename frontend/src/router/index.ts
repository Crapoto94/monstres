import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/carte', name: 'map', component: () => import('@/views/MapView.vue') },
    { path: '/ajouter', name: 'add-item', component: () => import('@/views/AddItemView.vue') },
    { path: '/alertes', name: 'alerts', component: () => import('@/views/AlertsView.vue') },
    { path: '/profil', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/connexion', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/inscription', name: 'register', component: () => import('@/views/RegisterView.vue') },
    {
      path: '/mot-de-passe-oublie',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
    },
    {
      path: '/reinitialiser-mot-de-passe',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/verifier-email',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
    },
  ],
})

// Restaure la session (cookie httpOnly) une seule fois, avant la première navigation.
router.beforeEach(async () => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.init()
  return true
})
