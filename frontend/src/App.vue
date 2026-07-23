<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'

const route = useRoute()
// L'appli est mobile-first (largeur plafonnée à max-w-lg partout), mais
// l'admin gagne à utiliser l'espace disponible sur grand écran (tableaux,
// listes de cartes) — plafond levé uniquement à partir de lg: (desktop),
// la vue smartphone de l'admin reste identique.
const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div
    class="mx-auto flex min-h-svh w-full flex-col bg-white dark:bg-gray-950"
    :class="isAdmin ? 'max-w-lg lg:max-w-none' : 'max-w-lg'"
  >
    <RouterView />
    <BottomNav />
  </div>
</template>
