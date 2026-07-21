<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchItem, type Item } from '@/services/items'
import { formatRelativeTime } from '@/utils/time'

const route = useRoute()
const item = ref<Item | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    item.value = await fetchItem(String(route.params.id))
  } catch {
    error.value = 'Ce Monstre est introuvable.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="flex-1 p-4">
    <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    <p v-else-if="error || !item" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <div v-else class="flex flex-col gap-3">
      <div class="flex gap-2 overflow-x-auto">
        <img
          v-for="photo in item.photos"
          :key="photo.id"
          :src="photo.path"
          class="h-48 w-48 flex-shrink-0 rounded-lg object-cover"
          alt=""
        />
      </div>

      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ item.title }}</h1>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        <span v-if="item.distance !== null">{{ item.distance }} km · </span>
        <span>{{ item.votesScore }} vote{{ item.votesScore > 1 ? 's' : '' }} · </span>
        <span>{{ formatRelativeTime(item.createdAt) }}</span>
      </p>

      <p v-if="item.category" class="text-sm text-gray-500 dark:text-gray-400">{{ item.category.name }}</p>

      <p v-if="item.description" class="text-gray-700 dark:text-gray-300">{{ item.description }}</p>

      <p class="text-sm text-gray-600 dark:text-gray-300">
        {{ item.address ?? `${item.latitude}, ${item.longitude}` }}
      </p>
      <p v-if="!item.address" class="text-xs text-gray-400 dark:text-gray-500">
        Connecte-toi pour voir l'adresse exacte.
      </p>

      <p class="text-sm text-gray-500 dark:text-gray-400">Publié par {{ item.user.name }}</p>
    </div>
  </section>
</template>
