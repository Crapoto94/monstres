<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { verifyEmail } from '@/services/auth'

const route = useRoute()
const status = ref<'pending' | 'success' | 'error'>('pending')

onMounted(async () => {
  const token = String(route.query.token ?? '')
  if (!token) {
    status.value = 'error'
    return
  }
  try {
    await verifyEmail(token)
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Vérification de l'email</h1>

    <p v-if="status === 'pending'" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Vérification…</p>
    <p v-else-if="status === 'success'" class="mt-4 text-sm text-green-600 dark:text-green-400">
      Ton email est confirmé. Tu peux maintenant profiter de l'application.
    </p>
    <p v-else class="mt-4 text-sm text-red-600 dark:text-red-400">
      Lien de vérification invalide ou expiré.
    </p>

    <RouterLink to="/profil" class="mt-4 inline-block text-brand-600 dark:text-brand-400">
      Retour au profil
    </RouterLink>
  </section>
</template>
