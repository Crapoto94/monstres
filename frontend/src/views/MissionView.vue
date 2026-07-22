<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, type ApiSuccess } from '@/services/api'

const content = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const { data: res } = await api.get<ApiSuccess<{ content: string }>>('/legal/mission')
    content.value = res.data.content ?? ''
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
      class="html-content mt-4 max-w-none text-sm text-gray-700 dark:text-gray-300"
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
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">💰 Gratuit, et ça le restera</h2>
      <p>
        Les Monstres est entièrement <strong>gratuit</strong> — sans publicité, sans abonnement, sans frais cachés.
        Pourquoi ? Parce que le projet est <strong>auto-hébergé</strong> : le serveur tourne sur un petit ordinateur
        chez l'association, pas sur les serveurs d'une grande entreprise tech. Tant que le coût d'exploitation
        reste faible (électricité + connexion internet), il n'y a aucune raison de mettre un prix.
      </p>
      <p>
        Pas de pub, pas de collecte de données pour revendre. L'objectif n'est pas de faire du profit,
        mais de <strong>créer un service utile</strong> pour les quartiers et la planète.
        Si un jour les coûts augmentent, on préviendra la communauté en transparence — mais l'idée de base
        restera toujours la même : un service libre, ouvert et gratuit.
      </p>
    </div>

    <RouterLink
      to="/"
      class="mt-6 inline-block text-sm font-medium text-brand-600 dark:text-brand-400"
    >
      ← Retour à l'accueil
    </RouterLink>
  </section>
</template>
