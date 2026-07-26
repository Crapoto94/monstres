<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fetchArchivedItems, type Item } from '@/services/items'
import { formatRelativeTime } from '@/utils/time'
import { useSeo } from '@/composables/useSeo'

useSeo({
  title: 'Archives des Monstres récupérés',
  description: 'Historique des Monstres déjà récupérés ou archivés — consultation seule.',
  path: '/archives',
})

const items = ref<Item[]>([])
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchArchivedItems({ page: page.value, pageSize: 20 })
    items.value = result.items
    totalPages.value = result.totalPages
    total.value = result.total
  } catch {
    error.value = 'Impossible de charger les archives.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(page, load)

function coverPhoto(item: Item) {
  return item.photos[0]?.thumbnailPath ?? item.photos[0]?.path ?? null
}
</script>

<template>
  <section class="flex-1 pb-20">
    <div class="sticky top-0 z-10 flex items-center gap-2 bg-white/90 px-4 py-3 backdrop-blur-md dark:bg-gray-900/90">
      <RouterLink
        to="/"
        class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        ←
      </RouterLink>
      <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">🗄️ Archives</h1>
    </div>

    <div class="px-4 pt-3">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Monstres archivés automatiquement 24h après leur publication — consultation seule, sans vote ni commentaire.
      </p>

      <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-else-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      <p v-else-if="items.length === 0" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Aucune archive pour l'instant.
      </p>

      <ul v-else class="mt-4 flex flex-col gap-3">
        <li v-for="item in items" :key="item.id">
          <RouterLink
            :to="`/monstres/${item.id}`"
            class="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 opacity-80 shadow-sm transition-opacity hover:opacity-100 dark:border-gray-800 dark:bg-gray-900/60"
          >
            <div class="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-200 grayscale dark:bg-gray-800">
              <img v-if="coverPhoto(item)" :src="coverPhoto(item)!" class="h-full w-full object-cover" alt="" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-2">
                <span class="truncate font-semibold text-gray-700 dark:text-gray-300">{{ item.title }}</span>
                <span class="flex-shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  Archivé
                </span>
              </p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ formatRelativeTime(item.createdAt) }}
              </p>
              <div class="mt-1.5 flex items-center gap-2">
                <span
                  v-if="item.category"
                  class="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  {{ item.category.name }}
                </span>
              </div>
            </div>
          </RouterLink>
        </li>
      </ul>

      <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          :disabled="page <= 1"
          class="rounded-full border border-gray-200 px-4 py-1.5 disabled:opacity-40 dark:border-gray-700"
          @click="page -= 1"
        >
          Précédent
        </button>
        <span class="text-gray-500 dark:text-gray-400">Page {{ page }} / {{ totalPages }} ({{ total }})</span>
        <button
          type="button"
          :disabled="page >= totalPages"
          class="rounded-full border border-gray-200 px-4 py-1.5 disabled:opacity-40 dark:border-gray-700"
          @click="page += 1"
        >
          Suivant
        </button>
      </div>
    </div>
  </section>
</template>
