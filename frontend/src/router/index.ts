import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/monstres/:id', name: 'item-detail', component: () => import('@/views/ItemDetailView.vue') },
    { path: '/carte', name: 'map', component: () => import('@/views/MapView.vue') },
    {
      path: '/ajouter',
      name: 'add-item',
      component: () => import('@/views/AddItemView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/alertes', name: 'alerts', component: () => import('@/views/AlertsView.vue') },
    { path: '/profil', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/communaute', name: 'community', component: () => import('@/views/CommunityView.vue') },
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
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/AdminDashboardView.vue') },
        { path: 'utilisateurs', name: 'admin-users', component: () => import('@/views/admin/AdminUsersView.vue') },
        { path: 'monstres', name: 'admin-items', component: () => import('@/views/admin/AdminItemsView.vue') },
        {
          path: 'categories',
          name: 'admin-categories',
          component: () => import('@/views/admin/AdminCategoriesView.vue'),
        },
        {
          path: 'parametres',
          name: 'admin-settings',
          component: () => import('@/views/admin/AdminSettingsView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // Restaure la session (cookie httpOnly) une seule fois, avant la première navigation.
  if (!auth.initialized) await auth.init()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/connexion', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { path: '/' }
  }
  return true
})
