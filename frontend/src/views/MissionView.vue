<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'

const content = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/legal/mission')
    content.value = data.content ?? ''
  } catch {
    content.value = ''
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="flex-1 p-4 pb-24">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Pourquoi Les Monstres ?</h1>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <div
      v-else-if="content"
      class="prose prose-sm dark:prose-invert mt-4 max-w-none text-gray-700 dark:text-gray-300"
      v-html="content"
    />

    <div v-else class="mt-6 flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
      <p>
        Chaque jour, des objets encombrants sont abandonnés dans la rue — meubles, électroménager, livres,
        jouets… La plupart finissent à la déchetterie, voire en dépôt sauvage, faute d'avoir trouvé
        un second propriétaire.
      </p>
      <p>
        <strong>Les Monstres</strong> existe pour changer ça. Notre mission : <em>redonner vie aux objets
        abandonnés</em> en créant un lien direct entre ceux qui les laissent et ceux qui peuvent
        les récupérer.
      </p>
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">🌍 Un engagement environnemental</h2>
      <p>
        Recycler, c'est bien. Réutiliser, c'est mieux. Chaque Monstre récupéré, c'est un objet de moins
        qui pollue et de moins qu'il faut fabriquer neuf. En participant, tu contribues directement
        à réduire les déchets et l'empreinte carbone de ta communauté.
      </p>
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">🤝 La force du partage</h2>
      <p>
        Les Monstres, c'est avant tout une communauté. On partage, on s'entraide, on donne une
        seconde chance aux objets. Un canapé qui ne te sert plus peut devenir le coin canapé parfait
        de quelqu'un d'autre. C'est la beauté du réusage : rien ne se perd, tout se transforme.
      </p>
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">♻️ Ensemble, on fait bouger les choses</h2>
      <p>
        Plus on est nombreux à signaler et récupérer les Monstres, plus on crée un cercle vertueux.
        Chaque récupération est un petit pas pour la planète, et un grand pas pour ta communauté.
        Rejoins-nous — ensemble, on transforme les déchets en opportunités.
      </p>
    </div>

    <RouterLink
      to="/profil"
      class="mt-6 inline-block text-sm font-medium text-brand-600 dark:text-brand-400"
    >
      ← Retour au profil
    </RouterLink>
  </section>
</template>
