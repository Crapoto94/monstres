<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { fetchCategories, type Category } from '@/services/categories'
import { createItem, type Item } from '@/services/items'

// Corrige le chemin des icônes par défaut de Leaflet (cassé par les bundlers).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const MAX_PHOTOS = 3
const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522] // Paris, si géoloc indisponible

const router = useRouter()
const step = ref(1)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const publishedItem = ref<Item | null>(null)

// Étape 1 — Photos
const photos = ref<File[]>([])
const photoPreviews = ref<string[]>([])
const photoError = ref<string | null>(null)

function onPhotosSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  photoError.value = null

  if (photos.value.length + files.length > MAX_PHOTOS) {
    photoError.value = `${MAX_PHOTOS} photos maximum.`
  }

  for (const file of files) {
    if (photos.value.length >= MAX_PHOTOS) break
    photos.value.push(file)
    photoPreviews.value.push(URL.createObjectURL(file))
  }
  input.value = ''
}

function removePhoto(index: number) {
  URL.revokeObjectURL(photoPreviews.value[index])
  photos.value.splice(index, 1)
  photoPreviews.value.splice(index, 1)
}

// Étape 2 — Position
const latitude = ref(DEFAULT_CENTER[0])
const longitude = ref(DEFAULT_CENTER[1])
const address = ref('')
const locating = ref(false)
const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

const addressQuery = ref('')
const addressResults = ref<Array<{ display_name: string; lat: string; lon: string }>>([])
const searching = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | undefined

function initMap() {
  if (map || !mapContainer.value) return
  map = L.map(mapContainer.value).setView([latitude.value, longitude.value], 16)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)

  marker = L.marker([latitude.value, longitude.value], { draggable: true }).addTo(map)
  marker.on('dragend', () => {
    const pos = marker!.getLatLng()
    latitude.value = pos.lat
    longitude.value = pos.lng
    reverseGeocode(pos.lat, pos.lng)
  })
}

function setPosition(lat: number, lng: number) {
  latitude.value = lat
  longitude.value = lng
  map?.setView([lat, lng], 16)
  marker?.setLatLng([lat, lng])
}

// Géocodage inverse : récupérer l'adresse à partir des coordonnées
async function reverseGeocode(lat: number, lng: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LesMonstres/1.0' },
    })
    const data = await response.json()
    if (data.display_name) {
      address.value = data.display_name
      addressQuery.value = data.display_name
    }
  } catch {
    // silencieux — l'adresse reste ce qu'elle était
  }
}

function locateMe() {
  if (!navigator.geolocation) return
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setPosition(lat, lng)
      reverseGeocode(lat, lng)
      locating.value = false
    },
    () => {
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}

watch(addressQuery, (query) => {
  clearTimeout(searchTimeout)
  if (query.trim().length < 3) {
    addressResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'LesMonstres/1.0' },
      })
      addressResults.value = await response.json()
    } finally {
      searching.value = false
    }
  }, 400)
})

function selectAddress(result: { display_name: string; lat: string; lon: string }) {
  address.value = result.display_name
  addressQuery.value = result.display_name
  addressResults.value = []
  setPosition(Number(result.lat), Number(result.lon))
}

// Étape 3 — Informations
const title = ref('')
const description = ref('')
const categoryId = ref('')
const categories = ref<Category[]>([])

onMounted(async () => {
  categories.value = await fetchCategories()
  locateMe()
})

onBeforeUnmount(() => {
  map?.remove()
  photoPreviews.value.forEach((url) => URL.revokeObjectURL(url))
})

watch(step, async (value) => {
  if (value === 2) {
    await nextTick()
    initMap()
    map?.invalidateSize()
  }
})

const selectedCategoryName = computed(
  () => categories.value.find((c) => c.id === categoryId.value)?.name ?? null,
)

const canGoNext = computed(() => {
  if (step.value === 1) return photos.value.length >= 1
  if (step.value === 2) return latitude.value !== null && longitude.value !== null
  if (step.value === 3) return title.value.trim().length >= 2
  return true
})

function next() {
  if (canGoNext.value && step.value < 4) step.value += 1
}
function back() {
  if (step.value > 1) step.value -= 1
}

async function publish() {
  submitting.value = true
  submitError.value = null
  try {
    publishedItem.value = await createItem({
      title: title.value,
      description: description.value || undefined,
      categoryId: categoryId.value || undefined,
      latitude: latitude.value,
      longitude: longitude.value,
      address: address.value || undefined,
      photos: photos.value,
    })
  } catch {
    submitError.value = 'La publication a échoué. Réessaie.'
  } finally {
    submitting.value = false
  }
}

function resetAndGoHome() {
  router.push('/')
}
</script>

<template>
  <section class="flex flex-1 flex-col p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Ajouter un Monstre</h1>

    <div v-if="publishedItem" class="mt-6 flex flex-col gap-3">
      <p class="text-green-600 dark:text-green-400">Ton Monstre « {{ publishedItem.title }} » est publié !</p>
      <button class="self-start rounded-lg bg-violet-600 px-4 py-2 text-sm text-white" @click="resetAndGoHome">
        Retour à l'accueil
      </button>
    </div>

    <template v-else>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Étape {{ step }} / 4</p>

      <!-- Étape 1 : Photos -->
      <div v-if="step === 1" class="mt-4 flex flex-col gap-3">
        <p class="text-sm text-gray-600 dark:text-gray-300">1 à {{ MAX_PHOTOS }} photos.</p>

        <div class="flex flex-wrap gap-3">
          <div
            v-for="(preview, index) in photoPreviews"
            :key="preview"
            class="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <img :src="preview" class="h-full w-full object-cover" alt="" />
            <button
              type="button"
              class="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
              @click="removePhoto(index)"
            >
              ✕
            </button>
          </div>

          <!-- Bouton principal : appareil photo -->
          <label
            v-if="photos.length < MAX_PHOTOS"
            class="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-violet-400 bg-violet-50 text-sm font-medium text-violet-600 dark:bg-violet-950 dark:text-violet-400"
          >
            📷 Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              class="hidden"
              @change="onPhotosSelected"
            />
          </label>

          <!-- Option galerie (sans capture) -->
          <label
            v-if="photos.length < MAX_PHOTOS"
            class="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-400 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400"
          >
            🖼️ Galerie
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              class="hidden"
              @change="onPhotosSelected"
            />
          </label>
        </div>

        <p v-if="photoError" class="text-sm text-red-600 dark:text-red-400">{{ photoError }}</p>
      </div>

      <!-- Étape 2 : Position -->
      <div v-else-if="step === 2" class="mt-4 flex flex-col gap-3">
        <div ref="mapContainer" class="h-64 w-full rounded-lg border border-gray-300 dark:border-gray-700"></div>

        <button
          type="button"
          class="self-start text-sm text-violet-600 dark:text-violet-400"
          :disabled="locating"
          @click="locateMe"
        >
          {{ locating ? 'Localisation…' : 'Utiliser ma position actuelle' }}
        </button>

        <div class="relative">
          <input
            v-model="addressQuery"
            type="text"
            placeholder="Rechercher une adresse…"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <ul
            v-if="addressResults.length"
            class="absolute z-10 mt-1 w-full rounded-lg border border-gray-300 bg-white text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <li
              v-for="result in addressResults"
              :key="result.display_name"
              class="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="selectAddress(result)"
            >
              {{ result.display_name }}
            </li>
          </ul>
        </div>

        <p v-if="address" class="text-xs text-gray-500 dark:text-gray-400">
          Adresse détectée : {{ address }}
        </p>
        <p v-else class="text-xs text-gray-500 dark:text-gray-400">
          Déplace le marqueur pour ajuster la position exacte.
        </p>
      </div>

      <!-- Étape 3 : Informations -->
      <div v-else-if="step === 3" class="mt-4 flex flex-col gap-4">
        <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
          Nom du Monstre
          <input
            v-model="title"
            type="text"
            placeholder="Ex. Canapé gris 3 places"
            required
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
          Description (optionnelle)
          <textarea
            v-model="description"
            rows="3"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          ></textarea>
        </label>

        <label class="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
          Catégorie (optionnelle)
          <select
            v-model="categoryId"
            class="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">—</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
      </div>

      <!-- Étape 4 : Publication -->
      <div v-else class="mt-4 flex flex-col gap-3">
        <div class="flex gap-2">
          <img
            v-for="preview in photoPreviews"
            :key="preview"
            :src="preview"
            class="h-16 w-16 rounded-lg object-cover"
            alt=""
          />
        </div>
        <p class="text-gray-900 dark:text-gray-100">{{ title }}</p>
        <p v-if="description" class="text-sm text-gray-600 dark:text-gray-300">{{ description }}</p>
        <p v-if="selectedCategoryName" class="text-sm text-gray-500 dark:text-gray-400">
          Catégorie : {{ selectedCategoryName }}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Position : {{ latitude.toFixed(5) }}, {{ longitude.toFixed(5) }}
        </p>
        <p v-if="address" class="text-xs text-gray-400 dark:text-gray-500">
          {{ address }}
        </p>

        <p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>

        <button
          type="button"
          :disabled="submitting"
          class="rounded-lg bg-violet-600 py-2 font-medium text-white disabled:opacity-50"
          @click="publish"
        >
          {{ submitting ? 'Publication…' : 'Publier' }}
        </button>
      </div>

      <div class="mt-6 flex justify-between">
        <button
          v-if="step > 1"
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          @click="back"
        >
          Retour
        </button>
        <span v-else></span>

        <button
          v-if="step < 4"
          type="button"
          :disabled="!canGoNext"
          class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          @click="next"
        >
          Suivant
        </button>
      </div>
    </template>
  </section>
</template>
