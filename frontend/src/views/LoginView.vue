<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Connexion</h1>

    <form class="mt-6 flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
        Email
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
        Mot de passe
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <p v-if="auth.error" class="text-sm text-red-600 dark:text-red-400">{{ auth.error }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg bg-violet-600 py-2 font-medium text-white disabled:opacity-50"
      >
        {{ submitting ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>

    <div class="mt-4 flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
      <RouterLink to="/mot-de-passe-oublie" class="text-violet-600 dark:text-violet-400">
        Mot de passe oublié ?
      </RouterLink>
      <span>
        Pas encore de compte ?
        <RouterLink to="/inscription" class="text-violet-600 dark:text-violet-400">S'inscrire</RouterLink>
      </span>
    </div>
  </section>
</template>
