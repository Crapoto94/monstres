<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const AVATARS = ['😺', '🐶', '🦊', '🐻', '🐼', '🐨', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦄', '🐙', '🦀', '🐳', '🌸', '🌻', '🍄', '⚡', '🔥', '💎', '🎯', '🚀', '🎸', '🎨', '👾', '🤖', '👻', '💀']

const selectedAvatar = computed(() => auth.user?.avatar ?? null)

function selectAvatar(emoji: string) {
  auth.setAvatar(selectedAvatar.value === emoji ? null : emoji)
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Profil</h1>

    <RouterLink
      to="/communaute"
      class="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400"
    >
      Nous → voir les membres de la communauté
    </RouterLink>

    <RouterLink
      v-if="auth.isModerator"
      :to="auth.isAdmin ? '/admin' : '/admin/signalements'"
      class="mt-2 flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400"
    >
      {{ auth.isAdmin ? 'Administration' : 'Modération' }}
    </RouterLink>

    <div v-if="auth.isAuthenticated && auth.user" class="mt-4 flex flex-col gap-3">
      <!-- Avatar -->
      <div class="flex items-center gap-3">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl dark:bg-brand-950"
        >
          {{ selectedAvatar ?? auth.user.name.charAt(0).toUpperCase() }}
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-gray-100">{{ auth.user.name }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ auth.user.email }}</p>
        </div>
      </div>

      <!-- Sélection d'avatar -->
      <div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Choisir un avatar</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="emoji in AVATARS"
            :key="emoji"
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all"
            :class="selectedAvatar === emoji
              ? 'bg-brand-600 ring-2 ring-brand-400'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'"
            @click="selectAvatar(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <p v-if="!auth.user.emailVerifiedAt" class="text-sm text-amber-600 dark:text-amber-400">
        Email non confirmé — vérifie ta boîte mail.
      </p>

      <p class="text-sm text-gray-500 dark:text-gray-400">Score : {{ auth.user.score }}</p>

      <button
        class="mt-2 self-start rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
        @click="auth.logout(); $router.push('/')"
      >
        Se déconnecter
      </button>
    </div>

    <div v-else class="mt-4 flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
      <p>Connecte-toi pour accéder à ton profil.</p>
      <RouterLink to="/connexion" class="text-brand-600 dark:text-brand-400">Se connecter</RouterLink>
      <RouterLink to="/inscription" class="text-brand-600 dark:text-brand-400">Créer un compte</RouterLink>
    </div>
  </section>
</template>
