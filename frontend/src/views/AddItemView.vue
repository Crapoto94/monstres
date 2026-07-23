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
import { fetchPublicSettings } from '@/services/settings'

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

// Partage groupe Facebook (§ settings `facebook_share_enabled`/`facebook_group_url`) :
// Facebook ne permet pas de poster automatiquement dans un groupe via l'API
// (permission `publish_to_groups` quasi impossible à obtenir depuis 2018) —
// on copie le texte du Monstre dans le presse-papier et on ouvre le groupe,
// à l'utilisateur de coller et publier lui-même.
const facebookGroupUrl = ref('')
const facebookShareEnabled = ref(false)
const shareOnFacebook = ref(true)
const facebookShareTriggered = ref(false)
const facebookShareAvailable = computed(() => facebookShareEnabled.value && !!facebookGroupUrl.value)

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
  try {
    const settings = await fetchPublicSettings()
    facebookGroupUrl.value = settings.facebookGroupUrl
    facebookShareEnabled.value = settings.facebookShareEnabled
  } catch {
    // silencieux — la case de partage reste simplement masquée
  }
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

/**
 * Déclenché par un clic explicite (pas automatiquement après `publish()`) :
 * `navigator.clipboard.writeText()` et `window.open()` exigent tous les
 * deux un geste utilisateur direct pour fonctionner de façon fiable sur
 * certains navigateurs (Safari en particulier) — après un `await` (la
 * requête de création du Monstre), l'« activation utilisateur » du clic
 * initial est perdue et les deux appels peuvent être silencieusement
 * bloqués. Facebook ne permet de toute façon pas de pré-remplir la zone
 * de post d'un Groupe via une URL — seul le copier-coller manuel marche.
 */
/** Mêmes 3 premiers segments que `shortAddress` sur ItemDetailView.vue (numéro, rue, ville). */
function shortenAddress(fullAddress: string): string {
  const parts = fullAddress.split(',').map((s) => s.trim())
  return parts.length <= 3 ? fullAddress : parts.slice(0, 3).join(', ')
}

async function shareToFacebookGroup(item: Item) {
  const itemUrl = `${window.location.origin}/monstres/${item.id}`
  const lines = [item.title]
  if (item.address) lines.push(`📍 ${shortenAddress(item.address)}`)
  lines.push(itemUrl)
  const text = lines.join('\n')
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // presse-papier indisponible (permission refusée, contexte non sécurisé) —
    // le lien de secours reste cliquable, l'utilisateur copiera le lien à la main
  }
  window.open(facebookGroupUrl.value, '_blank', 'noopener')
  facebookShareTriggered.value = true
}

function resetAndGoHome() {
  router.push('/')
}
</script>

<template>
  <section class="flex flex-1 flex-col p-4 pb-24">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Ajouter un Monstre</h1>

    <div v-if="publishedItem" class="mt-6 flex flex-col gap-4">
      <div class="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <p class="text-sm font-medium text-green-700 dark:text-green-300">
          ✓ Ton Monstre « {{ publishedItem.title }} » est publié !
        </p>
      </div>

      <template v-if="shareOnFacebook && facebookShareAvailable">
        <button
          v-if="!facebookShareTriggered"
          type="button"
          class="self-start rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
          @click="shareToFacebookGroup(publishedItem)"
        >
          📘 Partager dans le groupe Facebook
        </button>
        <p v-else class="text-sm text-gray-600 dark:text-gray-300">
          📘 Nom, adresse et lien copiés — colle-les (Ctrl/Cmd+V) dans le groupe.
          <a :href="facebookGroupUrl" target="_blank" rel="noopener" class="font-medium text-brand-600 underline dark:text-brand-400">
            Ouvrir le groupe
          </a>
        </p>
      </template>

      <button class="self-start rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700" @click="resetAndGoHome">
        Retour à l'accueil
      </button>
    </div>

    <template v-else>
      <!-- Stepper -->
      <nav class="mt-5 flex items-center gap-1" aria-label="Étapes">
        <template v-for="(s, i) in [
          { n: 1, label: 'Photo', icon: '📷' },
          { n: 2, label: 'Position', icon: '📍' },
          { n: 3, label: 'Infos', icon: '✏️' },
          { n: 4, label: 'Publier', icon: '🚀' },
        ]" :key="s.n">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              step === s.n
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : step > s.n
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            "
            @click="s.n < step ? (step = s.n) : undefined"
          >
            <span v-if="step > s.n" class="text-[10px]">✓</span>
            <span v-else>{{ s.icon }}</span>
            <span class="hidden sm:inline">{{ s.label }}</span>
          </button>
          <span v-if="i < 3" class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
        </template>
      </nav>

      <!-- Étape 1 : Photos -->
      <div v-if="step === 1" class="mt-5 flex flex-col gap-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">1 à {{ MAX_PHOTOS }} photos du Monstre.</p>

        <div class="flex flex-wrap gap-3">
          <div
            v-for="(preview, index) in photoPreviews"
            :key="preview"
            class="relative h-28 w-28 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700"
          >
            <img :src="preview" class="h-full w-full object-cover" alt="" />
            <button
              type="button"
              class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white transition-colors hover:bg-black/80"
              @click="removePhoto(index)"
            >
              ✕
            </button>
          </div>

          <label
            v-if="photos.length < MAX_PHOTOS"
            class="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 text-sm font-medium text-brand-600 transition-colors hover:border-brand-400 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-400"
          >
            <span class="text-2xl">📷</span>
            <span class="text-xs">Photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              class="hidden"
              @change="onPhotosSelected"
            />
          </label>

          <label
            v-if="photos.length < MAX_PHOTOS"
            class="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-800"
          >
            <span class="text-2xl">🖼️</span>
            <span class="text-xs">Galerie</span>
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
      <div v-else-if="step === 2" class="mt-5 flex flex-col gap-3">
        <div ref="mapContainer" class="h-64 w-full rounded-xl border border-gray-200 shadow-sm dark:border-gray-700"></div>

        <button
          type="button"
          class="self-start rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
          :disabled="locating"
          @click="locateMe"
        >
          {{ locating ? '⏳ Localisation…' : '📍 Utiliser ma position' }}
        </button>

        <div class="relative">
          <input
            v-model="addressQuery"
            type="text"
            placeholder="Rechercher une adresse…"
            class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-900"
          />
          <ul
            v-if="addressResults.length"
            class="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <li
              v-for="result in addressResults"
              :key="result.display_name"
              class="cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-brand-50 dark:hover:bg-gray-800"
              @click="selectAddress(result)"
            >
              {{ result.display_name }}
            </li>
          </ul>
        </div>

        <p v-if="address" class="text-xs text-gray-500 dark:text-gray-400">
          📍 {{ address }}
        </p>
        <p v-else class="text-xs text-gray-400 dark:text-gray-500">
          Déplace le marqueur ou recherche une adresse.
        </p>
      </div>

      <!-- Étape 3 : Informations -->
      <div v-else-if="step === 3" class="mt-5 flex flex-col gap-4">
        <label class="flex flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <span class="font-medium">Nom du Monstre</span>
          <input
            v-model="title"
            type="text"
            placeholder="Ex. Canapé gris 3 places"
            required
            class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <label class="flex flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <span class="font-medium">Description <span class="text-gray-400 dark:text-gray-500">(optionnel)</span></span>
          <textarea
            v-model="description"
            rows="3"
            placeholder="État, taille, particularités…"
            class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-900"
          ></textarea>
        </label>

        <label class="flex flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <span class="font-medium">Catégorie <span class="text-gray-400 dark:text-gray-500">(optionnel)</span></span>
          <select
            v-model="categoryId"
            class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">—</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
      </div>

      <!-- Étape 4 : Publication -->
      <div v-else class="mt-5 flex flex-col gap-4">
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <div class="flex gap-2">
            <img
              v-for="preview in photoPreviews"
              :key="preview"
              :src="preview"
              class="h-16 w-16 rounded-lg object-cover shadow-sm"
              alt=""
            />
          </div>
          <p class="mt-2 font-semibold text-gray-900 dark:text-gray-100">{{ title }}</p>
          <p v-if="description" class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ description }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span v-if="selectedCategoryName" class="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {{ selectedCategoryName }}
            </span>
            <span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              📍 {{ latitude.toFixed(4) }}, {{ longitude.toFixed(4) }}
            </span>
          </div>
          <p v-if="address" class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            {{ address }}
          </p>
        </div>

        <div v-if="facebookShareAvailable" class="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <label class="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="shareOnFacebook" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700" />
            Partager dans le groupe Facebook
          </label>
          <p v-if="shareOnFacebook" class="mt-1 pl-6 text-xs text-gray-400 dark:text-gray-500">
            Un bouton copiera le texte après publication — il faudra le coller dans le groupe.
          </p>
        </div>

        <p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>

        <button
          type="button"
          :disabled="submitting"
          class="rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition-colors hover:bg-brand-700 disabled:opacity-50"
          @click="publish"
        >
          {{ submitting ? '⏳ Publication…' : '🚀 Publier' }}
        </button>
      </div>

      <!-- Navigation bas -->
      <div class="mt-6 flex items-center justify-between">
        <button
          v-if="step > 1"
          type="button"
          class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          @click="back"
        >
          ← Retour
        </button>
        <span v-else></span>

        <button
          v-if="step < 4"
          type="button"
          :disabled="!canGoNext"
          class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition-colors hover:bg-brand-700 disabled:opacity-40"
          @click="next"
        >
          Suivant →
        </button>
      </div>
    </template>
  </section>
</template>
