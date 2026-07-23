<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import logo from '@/assets/logo-transparent.png'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await auth.login({ email: email.value, password: password.value })
    router.push(String(route.query.redirect ?? '/profil'))
  } catch {
    // l'erreur est déjà exposée via auth.error
  } finally {
    submitting.value = false
  }
}

function oauthUrl(provider: 'google' | 'facebook') {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/profil'
  return `${apiBaseUrl}/auth/${provider}?redirect=${encodeURIComponent(redirect)}`
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_unavailable: "La connexion Google n'est pas configurée pour l'instant.",
  facebook_unavailable: "La connexion Facebook n'est pas configurée pour l'instant.",
  oauth_failed: 'La connexion a échoué. Réessaie ou utilise ton email et ton mot de passe.',
}
const oauthError = typeof route.query.error === 'string' ? OAUTH_ERROR_MESSAGES[route.query.error] : null

// Connexion Facebook masquée au public tant que l'app n'a pas ses IDs
// définitifs validés par Meta (App Review) — bouton réel accessible via
// ?fbtest=1 pour les tests du développeur. À retirer une fois l'app en
// mode "Live" avec les identifiants de production.
const facebookTestMode = computed(() => route.query.fbtest === '1')
</script>

<template>
  <section class="flex-1 p-4">
    <div class="mx-auto max-w-sm">
      <div class="flex justify-center py-4">
        <img :src="logo" alt="Les Monstres" class="h-20 rounded-lg bg-white p-2 shadow-sm" />
      </div>

      <div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Connexion</h1>

        <p v-if="oauthError" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          {{ oauthError }}
        </p>

        <form class="mt-5 flex flex-col gap-4" @submit.prevent="onSubmit">
          <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            Email
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="rounded-xl border border-gray-200 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            Mot de passe
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="rounded-xl border border-gray-200 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <p v-if="auth.error" class="text-sm text-red-600 dark:text-red-400">{{ auth.error }}</p>

          <button
            type="submit"
            :disabled="submitting"
            class="rounded-xl bg-brand-600 py-2.5 font-medium text-white shadow-sm shadow-brand-600/30 transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {{ submitting ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>

        <div class="my-5 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-600">
          <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></span>
          ou
          <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></span>
        </div>

        <div class="flex flex-col gap-2.5">
          <a
            :href="oauthUrl('google')"
            class="flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4"><path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.89c2.28-2.1 3.54-5.2 3.54-8.87Z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.86l-3.89-3.01c-1.08.73-2.46 1.15-4.04 1.15-3.11 0-5.74-2.1-6.68-4.92H1.3v3.09C3.26 21.3 7.31 24 12 24Z"/><path fill="#FBBC05" d="M5.32 14.36A7.2 7.2 0 0 1 4.93 12c0-.82.14-1.61.39-2.36V6.55H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.45l4.02-3.09Z"/><path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.55l4.02 3.09C6.26 6.85 8.89 4.75 12 4.75Z"/></svg>
            Continuer avec Google
          </a>
          <a
            v-if="facebookTestMode"
            :href="oauthUrl('facebook')"
            class="flex items-center justify-center gap-2.5 rounded-xl bg-[#1877F2] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1465d8]"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.78 8.44-4.94 8.44-9.94Z"/></svg>
            Continuer avec Facebook
          </a>
          <div
            v-else
            class="flex cursor-not-allowed items-center justify-center gap-2.5 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500"
            title="La connexion Facebook sera activée une fois l'app validée par Meta."
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.78 8.44-4.94 8.44-9.94Z"/></svg>
            Facebook — bientôt disponible
          </div>
        </div>

        <RouterLink
          to="/inscription"
          class="mt-5 flex items-center justify-center gap-2 rounded-xl border-2 border-brand-600 py-2.5 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
        >
          Pas encore de compte ? S'inscrire
        </RouterLink>

        <div class="mt-4 text-center text-sm">
          <RouterLink to="/mot-de-passe-oublie" class="text-gray-500 dark:text-gray-400">
            Mot de passe oublié ?
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
