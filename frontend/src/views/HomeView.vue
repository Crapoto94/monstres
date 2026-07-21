<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fetchCategories, type Category } from '@/services/categories'
import { fetchItems, type Item } from '@/services/items'
import { formatRelativeTime } from '@/utils/time'

const appVersion = __APP_VERSION__

const items = ref<Item[]>([])
const categories = ref<Category[]>([])
const categoryId = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

const userLat = ref<number | null>(null)
const userLng = ref<number | null>(null)
const locating = ref(false)

function locateMe() {
  if (!navigator.geolocation) return
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLat.value = position.coords.latitude
      userLng.value = position.coords.longitude
      locating.value = false
    },
    () => {
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchItems({
      lat: userLat.value ?? undefined,
      lng: userLng.value ?? undefined,
      categoryId: categoryId.value || undefined,
      page: page.value,
      pageSize: 20,
    })
    items.value = result.items
    totalPages.value = result.totalPages
    total.value = result.total
  } catch {
    error.value = 'Impossible de charger les Monstres.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  categories.value = await fetchCategories()
  locateMe()
  await load()
})

watch([userLat, userLng, categoryId], () => {
  page.value = 1
  load()
})
watch(page, load)

function coverPhoto(item: Item) {
  return item.photos[0]?.thumbnailPath ?? item.photos[0]?.path ?? null
}
</script>

<template>
  <section class="flex-1 p-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Accueil</h1>
      <button
        type="button"
        class="text-sm text-violet-600 dark:text-violet-400"
        :disabled="locating"
        @click="locateMe"
      >
        {{ locating ? 'Localisation…' : 'Trier par distance' }}
      </button>
    </div>

    <select
      v-model="categoryId"
      class="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <option value="">Toutes les catégories</option>
      <option v-for="category in categories" :key="category.id" :value="category.id">
        {{ category.name }}
      </option>
    </select>

    <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-else-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    <p v-else-if="items.length === 0" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      Aucun Monstre à proximité pour l'instant.
    </p>

    <ul v-else class="mt-4 flex flex-col gap-3">
      <li v-for="item in items" :key="item.id">
        <RouterLink
          :to="`/monstres/${item.id}`"
          class="flex gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
        >
          <img
            v-if="coverPhoto(item)"
            :src="coverPhoto(item)!"
            class="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            alt=""
          />
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2">
              <span class="truncate font-medium text-gray-900 dark:text-gray-100">{{ item.title }}</span>
              <span
                v-if="item.status === 'RESERVED'"
                class="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              >
                Réservé
              </span>
              <span
                v-else-if="item.status === 'COLLECTED'"
                class="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
              >
                Récupéré
              </span>
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              <span v-if="item.distance !== null">{{ item.distance }} km · </span>
              <span>{{ item.votesScore }} vote{{ item.votesScore > 1 ? 's' : '' }} · </span>
              <span>{{ formatRelativeTime(item.createdAt) }}</span>
            </p>
            <p v-if="item.category" class="text-xs text-gray-400 dark:text-gray-500">{{ item.category.name }}</p>
          </div>
        </RouterLink>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between text-sm">
      <button
        type="button"
        :disabled="page <= 1"
        class="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
        @click="page -= 1"
      >
        Précédent
      </button>
      <span class="text-gray-500 dark:text-gray-400">Page {{ page }} / {{ totalPages }} ({{ total }})</span>
      <button
        type="button"
        :disabled="page >= totalPages"
        class="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
        @click="page += 1"
      >
        Suivant
      </button>
    </div>

    <p class="mt-8 text-center text-xs text-gray-300 dark:text-gray-700">Les Monstres v{{ appVersion }}</p>
  </section>
</template>
