<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fetchCategories, type Category } from '@/services/categories'
import { fetchItems, type Item } from '@/services/items'
import { formatRelativeTime } from '@/utils/time'
import { useAuthStore } from '@/stores/auth'
import logo from '@/assets/logo-transparent.png'

const auth = useAuthStore()

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
  <section class="flex-1 pb-20">
    <!-- Header sticky : logo + profil/connexion -->
    <div class="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-4 py-2 backdrop-blur-md dark:bg-gray-900/90">
      <RouterLink to="/" class="flex items-center">
        <img :src="logo" alt="Les Monstres" class="h-20 w-20 object-contain" />
      </RouterLink>
      <RouterLink
        v-if="auth.isAuthenticated && auth.user"
        to="/profil"
        class="flex items-center gap-2"
      >
        <div
          class="flex h-9 w-9 items-center justify-center rounded-full text-sm"
          :class="auth.user.avatar && (auth.user.avatar.startsWith('/') || auth.user.avatar.startsWith('http')) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'"
        >
          <img v-if="auth.user.avatar && (auth.user.avatar.startsWith('/') || auth.user.avatar.startsWith('http'))" :src="auth.user.avatar" class="h-9 w-9 rounded-full object-cover" alt="" />
          <span v-else>{{ auth.user.avatar ?? auth.user.name.charAt(0).toUpperCase() }}</span>
        </div>
      </RouterLink>
      <RouterLink
        v-else
        to="/connexion"
        class="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Se connecter
      </RouterLink>
    </div>

    <div class="px-4 pt-3">
      <div class="flex items-center justify-between gap-2">
        <select
          v-model="categoryId"
          class="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">Toutes les catégories</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
        <button
          type="button"
          class="flex-shrink-0 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 shadow-sm dark:bg-brand-900/60 dark:text-brand-200"
          :disabled="locating"
          @click="locateMe"
        >
          {{ locating ? '…' : '📍 Distance' }}
        </button>
      </div>

      <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-else-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      <p v-else-if="items.length === 0" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Aucun Monstre à proximité pour l'instant.
      </p>

      <ul v-else class="mt-4 flex flex-col gap-3">
        <li v-for="item in items" :key="item.id">
          <RouterLink
            :to="`/monstres/${item.id}`"
            class="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              <img v-if="coverPhoto(item)" :src="coverPhoto(item)!" class="h-full w-full object-cover" alt="" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-2">
                <span class="truncate font-semibold text-gray-900 dark:text-gray-100">{{ item.title }}</span>
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
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="item.distance !== null">{{ item.distance }} km · </span>
                <span>★ {{ item.votesScore }} · </span>
                <span>{{ formatRelativeTime(item.createdAt) }}</span>
              </p>
              <div class="mt-1.5 flex items-center gap-2">
                <span
                  v-if="item.category"
                  class="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/60 dark:text-brand-200"
                >
                  {{ item.category.name }}
                </span>
                <span class="text-[11px] text-gray-400 dark:text-gray-500">par {{ item.user.name }}</span>
              </div>
            </div>
            <!-- Avatar déposant -->
            <div class="flex flex-shrink-0 flex-col items-center justify-center gap-1 self-center">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full text-xs"
                :class="item.user.avatar && (item.user.avatar.startsWith('/') || item.user.avatar.startsWith('http')) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'"
              >
                <img v-if="item.user.avatar && (item.user.avatar.startsWith('/') || item.user.avatar.startsWith('http'))" :src="item.user.avatar" class="h-8 w-8 rounded-full object-cover" alt="" />
                <span v-else>{{ item.user.avatar ?? item.user.name.charAt(0).toUpperCase() }}</span>
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

    <p class="mt-8 pb-4 text-center text-xs text-gray-300 dark:text-gray-700">Les Monstres v{{ appVersion }}</p>
  </section>
</template>
