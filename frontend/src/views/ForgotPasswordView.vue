<script setup lang="ts">
import { ref } from 'vue'
import { forgotPassword } from '@/services/auth'

const email = ref('')
const submitting = ref(false)
const sent = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await forgotPassword(email.value)
    sent.value = true
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Mot de passe oublié</h1>

    <p v-if="sent" class="mt-4 text-sm text-gray-600 dark:text-gray-300">
      Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.
    </p>

    <form v-else class="mt-6 flex flex-col gap-4" @submit.prevent="onSubmit">
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

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg bg-violet-600 py-2 font-medium text-white disabled:opacity-50"
      >
        {{ submitting ? 'Envoi…' : 'Envoyer le lien' }}
      </button>
    </form>
  </section>
</template>
