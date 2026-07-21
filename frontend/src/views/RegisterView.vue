<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value })
    router.push('/profil')
  } catch {
    // l'erreur est déjà exposée via auth.error
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Inscription</h1>

    <form class="mt-6 flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
        Pseudo
        <input
          v-model="name"
          type="text"
          required
          minlength="2"
          autocomplete="name"
          class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

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
        Mot de passe (8 caractères minimum)
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <p v-if="auth.error" class="text-sm text-red-600 dark:text-red-400">{{ auth.error }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg bg-violet-600 py-2 font-medium text-white disabled:opacity-50"
      >
        {{ submitting ? 'Création…' : 'Créer mon compte' }}
      </button>
    </form>

    <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      Déjà un compte ?
      <RouterLink to="/connexion" class="text-violet-600 dark:text-violet-400">Se connecter</RouterLink>
    </p>
  </section>
</template>
