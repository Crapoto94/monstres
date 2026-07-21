<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

// Phase 1 : inscription, connexion, profil.
const auth = useAuthStore()
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Profil</h1>
    <p class="mt-2 text-gray-500 dark:text-gray-400">
      {{ auth.isAuthenticated ? auth.user?.name : 'Authentification à venir en Phase 1.' }}
    </p>
  </section>
</template>
