<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function onLogout() {
  await auth.logout()
  router.push('/')
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Profil</h1>

    <RouterLink
      to="/communaute"
      class="mt-3 inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400"
    >
      Nous → voir les membres de la communauté
    </RouterLink>

    <RouterLink
      v-if="auth.isAdmin"
      to="/admin"
      class="mt-2 flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400"
    >
      Administration
    </RouterLink>

    <div v-if="auth.isAuthenticated && auth.user" class="mt-4 flex flex-col gap-3">
      <p class="text-gray-900 dark:text-gray-100">{{ auth.user.name }}</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ auth.user.email }}</p>

      <p v-if="!auth.user.emailVerifiedAt" class="text-sm text-amber-600 dark:text-amber-400">
        Email non confirmé — vérifie ta boîte mail.
      </p>

      <p class="text-sm text-gray-500 dark:text-gray-400">Score : {{ auth.user.score }}</p>

      <button
        class="mt-2 self-start rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
        @click="onLogout"
      >
        Se déconnecter
      </button>
    </div>

    <div v-else class="mt-4 flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
      <p>Connecte-toi pour accéder à ton profil.</p>
      <RouterLink to="/connexion" class="text-violet-600 dark:text-violet-400">Se connecter</RouterLink>
      <RouterLink to="/inscription" class="text-violet-600 dark:text-violet-400">Créer un compte</RouterLink>
    </div>
  </section>
</template>
