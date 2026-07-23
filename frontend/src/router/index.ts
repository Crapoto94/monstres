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
      meta: { requiresAuth: true, requiresVerifiedEmail: true },
    },
    { path: '/alertes', name: 'alerts', component: () => import('@/views/AlertsView.vue') },
    { path: '/profil', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/communaute', name: 'community', component: () => import('@/views/CommunityView.vue') },
    { path: '/mentions-legales', name: 'legal-notices', component: () => import('@/views/LegalView.vue') },
    { path: '/rgpd', name: 'legal-rgpd', component: () => import('@/views/RgpdView.vue') },
    { path: '/pourquoi', name: 'mission', component: () => import('@/views/MissionView.vue') },
    {
      path: '/suppression-donnees',
      name: 'data-deletion',
      component: () => import('@/views/DataDeletionView.vue'),
    },
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
      path: '/tutoriel',
      name: 'tutorial',
      component: () => import('@/views/TutorialView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
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
          path: 'tutoriel',
          name: 'admin-tutorial',
          component: () => import('@/views/admin/AdminTutorialView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'mails',
          name: 'admin-emails',
          component: () => import('@/views/admin/AdminEmailTemplatesView.vue'),
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
        {
          path: 'journal',
          name: 'admin-audit-log',
          component: () => import('@/views/admin/AdminAuditLogView.vue'),
          meta: { requiresAdmin: true, requiresSuperAdmin: true },
        },
        {
          path: 'journal-mails',
          name: 'admin-email-log',
          component: () => import('@/views/admin/AdminEmailLogView.vue'),
          meta: { requiresAdmin: true, requiresSuperAdmin: true },
        },
        {
          path: 'journal-whatsapp',
          name: 'admin-whatsapp-log',
          component: () => import('@/views/admin/AdminWhatsAppLogView.vue'),
          meta: { requiresAdmin: true, requiresSuperAdmin: true },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.init()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/connexion', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresVerifiedEmail && !auth.user?.emailVerifiedAt) {
    return { path: '/profil', query: { error: 'email_not_verified' } }
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
  // Tutoriel affiché juste après vérification de l'email (pas dès
  // l'inscription) — un compte non vérifié navigue librement jusque-là,
  // simplement restreint sur la localisation exacte et la publication.
  if (auth.isAuthenticated && auth.user?.emailVerifiedAt && !auth.user?.onboardingCompletedAt && to.name !== 'tutorial') {
    return { path: '/tutoriel' }
  }
  return true
})
