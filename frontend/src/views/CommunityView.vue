<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchCommunity, type CommunityMember } from '@/services/community'

const members = ref<CommunityMember[]>([])
const loading = ref(true)

onMounted(async () => {
  members.value = await fetchCommunity()
  loading.value = false
})

function formatJoinDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Nous</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les membres de la communauté Les Monstres.</p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <ul v-else class="mt-4 flex flex-col gap-3">
      <li
        v-for="member in members"
        :key="member.id"
        class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
      >
        <div class="flex items-center gap-3">
          <img
            v-if="member.avatar"
            :src="member.avatar"
            class="h-10 w-10 flex-shrink-0 rounded-full object-cover"
            alt=""
          />
          <div
            v-else
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          >
            {{ member.name.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ member.name }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">Membre depuis le {{ formatJoinDate(member.createdAt) }}</p>
          </div>
          <div class="flex-shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {{ member.score }} pts
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span class="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {{ member.itemsCreated }} déclaré{{ member.itemsCreated > 1 ? 's' : '' }}
          </span>
          <span class="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {{ member.itemsReserved }} réservé{{ member.itemsReserved > 1 ? 's' : '' }}
          </span>
          <span class="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
            {{ member.itemsCollected }} récupéré{{ member.itemsCollected > 1 ? 's' : '' }}
          </span>
          <span class="rounded-full bg-brand-100 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            ★ {{ member.votesReceived }} vote{{ member.votesReceived > 1 ? 's' : '' }} reçu{{ member.votesReceived > 1 ? 's' : '' }}
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>
