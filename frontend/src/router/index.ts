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
      // Porte d'entrée large (MODERATOR/ADMIN/SUPER_ADMIN) : les sous-routes
      // réservées ADMIN/SUPER_ADMIN ajoutent `requiresAdmin` en plus (§5 —
      // le Modérateur ne gère que les signalements, pas utilisateurs/
      // Monstres/catégories/paramètres).
      meta: { requiresModerator: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboardView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'utilisateurs',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsersView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'monstres',
          name: 'admin-items',
          component: () => import('@/views/admin/AdminItemsView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: () => import('@/views/admin/AdminCategoriesView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'parametres',
          name: 'admin-settings',
          component: () => import('@/views/admin/AdminSettingsView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'signalements',
          name: 'admin-reports',
          component: () => import('@/views/admin/AdminReportsView.vue'),
        },
        {
          path: 'sql',
          name: 'admin-sql',
          component: () => import('@/views/admin/AdminSqlView.vue'),
          meta: { requiresAdmin: true, requiresSuperAdmin: true },
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
  if (to.meta.requiresModerator && !auth.isModerator) {
    return { path: '/' }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { path: '/admin/signalements' }
  }
  if (to.meta.requiresSuperAdmin && auth.user?.role !== 'SUPER_ADMIN') {
    return { path: '/admin' }
  }
  return true
})
