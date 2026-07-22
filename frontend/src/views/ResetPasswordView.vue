<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { resetPassword } from '@/services/auth'

const route = useRoute()
const router = useRouter()

const token = String(route.query.token ?? '')
const password = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  submitting.value = true
  error.value = null
  try {
    await resetPassword({ token, password: password.value })
    router.push('/connexion')
  } catch (err) {
    error.value = isAxiosError(err)
      ? (err.response?.data?.error?.message ?? 'Lien invalide ou expiré.')
      : 'Lien invalide ou expiré.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Nouveau mot de passe</h1>

    <p v-if="!token" class="mt-4 text-sm text-red-600 dark:text-red-400">Lien invalide.</p>

    <form v-else class="mt-6 flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
        Nouveau mot de passe (8 caractères minimum)
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg bg-brand-600 py-2 font-medium text-white disabled:opacity-50"
      >
        {{ submitting ? 'Enregistrement…' : 'Réinitialiser le mot de passe' }}
      </button>
    </form>
  </section>
</template>
