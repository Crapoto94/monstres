<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import { fetchPublicSettings } from '@/services/settings'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'

const route = useRoute()
const auth = useAuthStore()
const messagesStore = useMessagesStore()
// L'appli est mobile-first (largeur plafonnée à max-w-lg partout), mais
// l'admin gagne à utiliser l'espace disponible sur grand écran (tableaux,
// listes de cartes) — plafond levé uniquement à partir de lg: (desktop),
// la vue smartphone de l'admin reste identique.
const isAdmin = computed(() => route.path.startsWith('/admin'))

// Bandeau bêta (réglage `beta_mode_enabled`, admin → Paramètres) : masqué en
// admin (déjà su), pas affiché si les settings sont injoignables plutôt que
// de bloquer l'affichage de l'appli.
const betaModeEnabled = ref(false)
onMounted(async () => {
  try {
    betaModeEnabled.value = (await fetchPublicSettings()).betaModeEnabled
  } catch {
    // silencieux
  }
})

// Rafraîchit le compteur de non-lus (messages) à chaque changement d'auth
// (connexion/déconnexion) — le badge de la BottomNav le lit.
watch(
  () => auth.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      messagesStore.refreshUnreadCount()
    } else {
      messagesStore.unreadCount = 0
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="mx-auto flex min-h-svh w-full flex-col bg-white dark:bg-gray-950"
    :class="isAdmin ? 'max-w-lg lg:max-w-none' : 'max-w-lg'"
  >
    <p
      v-if="betaModeEnabled && !isAdmin"
      class="bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    >
      🧪 Version bêta, en cours de test — les Monstres affichés ne sont peut-être pas réels.
    </p>
    <RouterView />
    <BottomNav v-if="!isAdmin" />
  </div>
</template>
