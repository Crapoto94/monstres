<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fetchCommunity, type CommunityMember } from '@/services/community'
import { useSeo } from '@/composables/useSeo'

useSeo({
  title: 'La communauté',
  description: 'Découvre les membres qui repèrent, partagent et récupèrent les Monstres près de chez toi.',
  path: '/communaute',
})

const members = ref<CommunityMember[]>([])
const loading = ref(true)
const search = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function loadMembers(term?: string) {
  loading.value = true
  members.value = await fetchCommunity(term)
  loading.value = false
}

onMounted(() => loadMembers())

watch(search, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadMembers(value || undefined), 300)
})

function formatJoinDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isImageAvatar(avatar: string | null): boolean {
  return !!avatar && /^(\/|https?:\/\/)/.test(avatar)
}
</script>

<template>
  <section class="flex-1 p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Nous</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les membres de la communauté Les Monstres.</p>

    <div class="relative mt-4">
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher un membre…"
        class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
      />
      <svg class="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

    <p v-else-if="members.length === 0" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      Aucun membre trouvé.
    </p>

    <ul v-else class="mt-4 flex flex-col gap-3">
      <li
        v-for="member in members"
        :key="member.id"
        class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
      >
        <div class="flex items-center gap-3">
          <img
            v-if="isImageAvatar(member.avatar)"
            :src="member.avatar!"
            class="h-10 w-10 flex-shrink-0 rounded-full object-cover"
            alt=""
          />
          <div
            v-else
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          >
            {{ member.avatar ?? member.name.charAt(0).toUpperCase() }}
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
