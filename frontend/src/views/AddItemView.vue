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
import { resizeImageFile } from '@/utils/image'
import {
  formatShortAddress,
  formatShortBanAddress,
  pickBestBanFeature,
  type BanAddressProperties,
  type NominatimAddress,
} from '@/utils/address'

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

// Disclaimer admin-éditable
const disclaimerContent = ref('')

// Ressourceries à proximité
interface Ressourcerie {
  name: string
  lat: number
  lng: number
  source: 'gogofull' | 'emmaus'
  distance?: number
  address?: string
  phone?: string
  email?: string
  website?: string
  categories?: string[]
  thumb?: string
  permalink?: string
  openingHours?: string
}
const nearbyRessourceries = ref<Ressourcerie[]>([])
const ressourceriesLoading = ref(false)
const showRessourceriesPopup = ref(false)
const selectedRessourcerie = ref<Ressourcerie | null>(null)

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

const resizingPhotos = ref(false)

async function onPhotosSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  photoError.value = null

  if (photos.value.length + files.length > MAX_PHOTOS) {
    photoError.value = `${MAX_PHOTOS} photos maximum.`
  }

  resizingPhotos.value = true
  try {
    for (const file of files) {
      if (photos.value.length >= MAX_PHOTOS) break
      const resized = await resizeImageFile(file)
      photos.value.push(resized)
      photoPreviews.value.push(URL.createObjectURL(resized))
    }
  } finally {
    resizingPhotos.value = false
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

interface AddressResult {
  shortLabel: string
  lat: number
  lon: number
}

const addressQuery = ref('')
const addressResults = ref<AddressResult[]>([])
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

// Géocodage inverse : BAN (Base Adresse Nationale, data.gouv.fr) en priorité —
// couverture des numéros de rue nettement meilleure que Nominatim/OSM pour la
// France (vérifié en pratique : une adresse sans numéro via Nominatim en a un
// via la BAN à la même position). Repli sur Nominatim si la BAN ne répond
// rien (indisponible, hors zone couverte…).
async function reverseGeocode(lat: number, lng: number) {
  try {
    const banUrl = `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`
    const banResponse = await fetch(banUrl)
    const banData = await banResponse.json()
    const feature = pickBestBanFeature(banData?.features)
    if (feature) {
      const short = formatShortBanAddress(feature.properties)
      address.value = short
      addressQuery.value = short
      return
    }
  } catch {
    // repli Nominatim ci-dessous
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}&accept-language=fr`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LesMonstres/1.0' },
    })
    const data = await response.json()
    if (data.display_name) {
      const short = formatShortAddress(data.address, data.display_name)
      address.value = short
      addressQuery.value = short
    }
  } catch {
    // silencieux — l'adresse reste ce qu'elle était
  }
}

const POSITION_CACHE_KEY = 'monstres_last_position'
const POSITION_CACHE_TTL = 2 * 60 * 1000 // 2 minutes

function getCachedPosition(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(POSITION_CACHE_KEY)
    if (!raw) return null
    const { lat, lng, ts } = JSON.parse(raw)
    if (Date.now() - ts > POSITION_CACHE_TTL) return null
    return { lat, lng }
  } catch {
    return null
  }
}

function cachePosition(lat: number, lng: number) {
  try {
    localStorage.setItem(POSITION_CACHE_KEY, JSON.stringify({ lat, lng, ts: Date.now() }))
  } catch { /* ignore */ }
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
      cachePosition(lat, lng)
      fetchNearbyRessourceries(lat, lng)
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
      addressResults.value = await searchAddresses(query)
    } finally {
      searching.value = false
    }
  }, 400)
})

// Recherche d'adresse : BAN en priorité (biaisée vers la position actuelle
// du marqueur via lat/lon), repli Nominatim si la BAN ne renvoie rien.
async function searchAddresses(query: string): Promise<AddressResult[]> {
  try {
    const banUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&lat=${latitude.value}&lon=${longitude.value}`
    const banResponse = await fetch(banUrl)
    const banData = await banResponse.json()
    const features = banData?.features ?? []
    if (features.length) {
      return features.map((feature: { properties: BanAddressProperties; geometry: { coordinates: [number, number] } }) => ({
        shortLabel: formatShortBanAddress(feature.properties),
        lon: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
      }))
    }
  } catch {
    // repli Nominatim ci-dessous
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=fr&limit=5&q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LesMonstres/1.0' },
    })
    const results: Array<{ display_name: string; lat: string; lon: string; address?: NominatimAddress }> =
      await response.json()
    return results.map((result) => ({
      shortLabel: formatShortAddress(result.address, result.display_name),
      lat: Number(result.lat),
      lon: Number(result.lon),
    }))
  } catch {
    return []
  }
}

function selectAddress(result: AddressResult) {
  address.value = result.shortLabel
  addressQuery.value = result.shortLabel
  addressResults.value = []
  setPosition(result.lat, result.lon)
  if (nearbyRessourceries.value.length === 0) {
    fetchNearbyRessourceries(result.lat, result.lon)
  }
}

// Étape 3 — Informations
const title = ref('')
const description = ref('')
const categoryId = ref('')
const categories = ref<Category[]>([])

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function fetchNearbyRessourceries(userLat: number, userLng: number) {
  ressourceriesLoading.value = true
  try {
    const [gogoData, emmausData] = await Promise.allSettled([
      fetch('https://ressourceries.gogocarto.fr/api/elements?ontology=gogofull').then((r) => r.json()),
      fetch('https://www.emmaus-france.org/boutiquesjson.php').then((r) => r.json()),
    ])

    const all: Ressourcerie[] = []

    if (gogoData.status === 'fulfilled' && Array.isArray(gogoData.value?.data)) {
      for (const entry of gogoData.value.data) {
        const name = entry.name
        const lat = entry.geo?.latitude
        const lng = entry.geo?.longitude
        if (name && typeof lat === 'number' && typeof lng === 'number') {
          all.push({
            name,
            lat,
            lng,
            source: 'gogofull',
            address: entry.address?.customFormatedAddress,
            categories: entry.categories,
            website: entry.url,
            phone: entry.phone,
          })
        }
      }
    }

    if (emmausData.status === 'fulfilled' && emmausData.value?.listsrc) {
      for (const entry of emmausData.value.listsrc) {
        const name = entry.title
        const gpsParts = entry.gps?.split(',')
        const lat = gpsParts ? parseFloat(gpsParts[0]) : NaN
        const lng = gpsParts ? parseFloat(gpsParts[1]) : NaN
        if (name && !isNaN(lat) && !isNaN(lng)) {
          all.push({
            name,
            lat,
            lng,
            source: 'emmaus',
            address: entry.adresse,
            phone: entry.telephone,
            email: entry.email,
            website: entry.url,
            thumb: entry.thumb,
            permalink: entry.permalink,
            openingHours: extractEmmausHours(entry),
          })
        }
      }
    }

    const withDistance = all
      .map((r) => ({ ...r, distance: haversineDistance(userLat, userLng, r.lat, r.lng) }))
      .filter((r) => r.distance < 100)
      .sort((a, b) => a.distance - b.distance)

    const seen = new Set<string>()
    nearbyRessourceries.value = withDistance.filter((r) => {
      const key = r.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 5)
  } catch {
    // silencieux
  } finally {
    ressourceriesLoading.value = false
  }
}

function extractEmmausHours(entry: Record<string, unknown>): string {
  const days: { key: string; label: string }[] = [
    { key: 'h_1', label: 'Lun' },
    { key: 'h_2', label: 'Mar' },
    { key: 'h_3', label: 'Mer' },
    { key: 'h_4', label: 'Jeu' },
    { key: 'h_5', label: 'Ven' },
    { key: 'h_6', label: 'Sam' },
    { key: 'h_7', label: 'Dim' },
  ]
  const lines: string[] = []
  for (const d of days) {
    const am = entry[`${d.key}_am_begin`]
    const pm = entry[`${d.key}_pm_end`]
    if (am && pm) {
      lines.push(`${d.label} ${am}–${pm}`)
    }
  }
  return lines.join(' · ')
}

function goToItinerary(lat: number, lng: number) {
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile) {
    window.open(`geo:${lat},${lng}?q=${lat},${lng}`, '_blank')
  } else {
    window.open(`https://www.openstreetmap.org/directions?from=&to=${lat}%2C${lng}`, '_blank')
  }
}

function openRessourceries() {
  showRessourceriesPopup.value = true
  if (nearbyRessourceries.value.length === 0 && latitude.value && longitude.value) {
    fetchNearbyRessourceries(latitude.value, longitude.value)
  }
}

onMounted(async () => {
  categories.value = await fetchCategories()
  try {
    const settings = await fetchPublicSettings()
    facebookGroupUrl.value = settings.facebookGroupUrl
    facebookShareEnabled.value = settings.facebookShareEnabled
    disclaimerContent.value = settings.addItemDisclaimerContent
  } catch {
    // silencieux — la case de partage reste simplement masquée
  }

  const cached = getCachedPosition()
  if (cached) {
    setPosition(cached.lat, cached.lng)
    fetchNearbyRessourceries(cached.lat, cached.lng)
  } else {
    locateMe()
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

        <p v-if="resizingPhotos" class="text-sm text-gray-500 dark:text-gray-400">⏳ Optimisation de la photo…</p>
        <p v-if="photoError" class="text-sm text-red-600 dark:text-red-400">{{ photoError }}</p>

        <div
          v-if="disclaimerContent"
          class="html-content rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          v-html="disclaimerContent"
        />

        <div
          v-if="latitude && longitude"
          class="flex flex-col gap-2"
        >
          <button
            type="button"
            class="self-start rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
            :disabled="ressourceriesLoading"
            @click="openRessourceries"
          >
            {{ ressourceriesLoading ? '⏳ Recherche…' : '♻️ Trouve une ressourcerie' }}
          </button>
        </div>

        <!-- Popup ressourceries -->
        <Teleport to="body">
          <Transition
            enter-active-class="duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="showRessourceriesPopup"
              class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
              @click.self="showRessourceriesPopup = false"
            >
              <div class="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl">
                <div class="mb-3 flex items-center justify-between">
                  <h3 class="text-base font-semibold text-gray-900 dark:text-white">♻️ Déchèteries & ressourceries</h3>
                  <button
                    type="button"
                    class="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    @click="showRessourceriesPopup = false"
                  >✕</button>
                </div>
                <p v-if="ressourceriesLoading" class="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
                <p v-else-if="nearbyRessourceries.length === 0" class="text-sm text-gray-500 dark:text-gray-400">Aucune ressourcerie trouvée à proximité.</p>
                <ul v-else class="flex flex-col gap-2">
                  <li
                    v-for="r in nearbyRessourceries"
                    :key="`${r.name}-${r.lat}-${r.lng}`"
                    class="flex items-center justify-between text-sm text-brand-700 dark:text-brand-300"
                  >
                    <span class="flex min-w-0 items-center gap-1.5">
                      <button
                        type="button"
                        class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-600 transition-colors hover:bg-brand-200 dark:bg-brand-800 dark:text-brand-300 dark:hover:bg-brand-700"
                        title="Détails"
                        @click="selectedRessourcerie = r"
                      >?</button>
                      <span class="truncate">{{ r.name }}</span>
                      <span class="shrink-0 text-brand-500 dark:text-brand-400">· {{ Math.round(r.distance ?? 0) }} km</span>
                    </span>
                    <button
                      type="button"
                      class="ml-2 shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700"
                      @click="goToItinerary(r.lat, r.lng)"
                    >
                      Y aller
                    </button>
                  </li>
                </ul>
                <!-- Détail d'une ressourcerie -->
                <Transition
                  enter-active-class="duration-200 ease-out"
                  enter-from-class="opacity-0"
                  enter-to-class="opacity-100"
                  leave-active-class="duration-150 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <div
                    v-if="selectedRessourcerie"
                    class="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-800 dark:bg-brand-950"
                  >
                    <div class="mb-2 flex items-start justify-between gap-2">
                      <h4 class="font-semibold text-gray-900 dark:text-white">{{ selectedRessourcerie.name }}</h4>
                      <button
                        type="button"
                        class="shrink-0 rounded-lg p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        @click="selectedRessourcerie = null"
                      >✕</button>
                    </div>
                    <div class="flex flex-col gap-1.5 text-gray-600 dark:text-gray-400">
                      <p v-if="selectedRessourcerie.distance">
                        📍 {{ Math.round(selectedRessourcerie.distance) }} km
                      </p>
                      <p v-if="selectedRessourcerie.address">
                        🏠 {{ selectedRessourcerie.address }}
                      </p>
                      <p v-if="selectedRessourcerie.phone">
                        📞 <a :href="`tel:${selectedRessourcerie.phone}`" class="text-brand-600 hover:underline dark:text-brand-400">{{ selectedRessourcerie.phone }}</a>
                      </p>
                      <p v-if="selectedRessourcerie.email">
                        ✉️ <a :href="`mailto:${selectedRessourcerie.email}`" class="text-brand-600 hover:underline dark:text-brand-400">{{ selectedRessourcerie.email }}</a>
                      </p>
                      <p v-if="selectedRessourcerie.website">
                        🌐 <a :href="selectedRessourcerie.website" target="_blank" rel="noopener" class="text-brand-600 hover:underline dark:text-brand-400">Site web</a>
                      </p>
                      <p v-if="selectedRessourcerie.permalink">
                        🔗 <a :href="selectedRessourcerie.permalink" target="_blank" rel="noopener" class="text-brand-600 hover:underline dark:text-brand-400">Page Emmaüs</a>
                      </p>
                      <p v-if="selectedRessourcerie.categories?.length">
                        🏷️ {{ selectedRessourcerie.categories.join(', ') }}
                      </p>
                      <p v-if="selectedRessourcerie.openingHours">
                        🕐 {{ selectedRessourcerie.openingHours }}
                      </p>
                    </div>
                  </div>
                </Transition>
                <p v-if="nearbyRessourceries.length > 0" class="mt-2 text-[11px] text-brand-600/70 dark:text-brand-400/70">
                  Tu peux y déposer ton objet en toute légalité.
                </p>
              </div>
            </div>
          </Transition>
        </Teleport>
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
              :key="`${result.lat}-${result.lon}-${result.shortLabel}`"
              class="cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-brand-50 dark:hover:bg-gray-800"
              @click="selectAddress(result)"
            >
              {{ result.shortLabel }}
            </li>
          </ul>
        </div>

        <p v-if="address" class="text-xs text-gray-500 dark:text-gray-400">
          📍 {{ shortenAddress(address) }}
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
            {{ shortenAddress(address) }}
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
