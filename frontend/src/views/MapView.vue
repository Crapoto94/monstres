<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import monsterMarker from '@/assets/monster-marker.png'
import { fetchItems, fetchArchivedItems, type Item } from '@/services/items'
import { createSubscription, fetchSubscriptions, type Subscription } from '@/services/subscriptions'
import { useAuthStore } from '@/stores/auth'
import { useSeo } from '@/composables/useSeo'

useSeo({
  title: 'La carte des encombrants',
  description:
    'Visualise sur une carte tous les Monstres — meubles et objets encombrants abandonnés dans la rue — signalés près de chez toi.',
  path: '/carte',
})

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522]

const ACTIVE_SIZE = 38
const ARCHIVED_SIZE = 20 // "plus petits" sur la carte (demande utilisateur)

/** Plages temporelles proposées par le curseur (index = position du slider). */
const RANGE_OPTIONS = [1, 2, 3, 7, 30, 365, 730] as const
const RANGE_LABELS = ['1 jour', '2 jours', '3 jours', '1 semaine', '1 mois', '1 an', '2 ans']
const DEFAULT_INDEX = 3 // 1 semaine
const PAGE_SIZE = 50
/** Délai avant de recharger les Monstres quand on déplace le curseur (évite de
 * vider la carte à chaque pixel de glissement). */
const REFRESH_DEBOUNCE_MS = 400

/** Icône monstre (fond noir détouré, voir frontend/src/assets/monster-marker.png).
 * Les archives sont plus petites et légèrement estompées pour se distinguer
 * des Monstres actifs, sans disparaître de la carte. */
function monsterIcon(archived: boolean): L.DivIcon {
  const size = archived ? ARCHIVED_SIZE : ACTIVE_SIZE
  return L.divIcon({
    className: '',
    html: `<img src="${monsterMarker}" style="width:${size}px;height:${size}px;display:block;opacity:${archived ? 0.65 : 1};filter:drop-shadow(0 1px 3px rgba(0,0,0,.45));" alt="" />`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

const router = useRouter()
const auth = useAuthStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const rangeIndex = ref(DEFAULT_INDEX)
let map: L.Map | null = null
let markerLayer: L.LayerGroup | null = null
let subscriptionLayer: L.LayerGroup | null = null
let zonePreviewLayer: L.LayerGroup | null = null
let loadSequence = 0
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Création d'une zone d'alerte directement sur la carte (clic + rayon).
const zoneMode = ref(false)
const zoneName = ref('')
const zoneRadiusKm = ref(1)
const zoneLat = ref<number | null>(null)
const zoneLng = ref<number | null>(null)
const creatingZone = ref(false)
const zoneError = ref<string | null>(null)
const MAX_RADIUS_KM = 5

const rangeDays = computed(() => RANGE_OPTIONS[rangeIndex.value])
const since = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - rangeDays.value)
  return date.toISOString()
})

async function loadItems() {
  if (!map || !markerLayer) return
  loading.value = true
  error.value = null
  const sequence = ++loadSequence

  try {
    const fetchAll = async <T>(
      fetcher: (page: number) => Promise<{ items: T[]; totalPages: number }>,
    ): Promise<T[]> => {
      const all: T[] = []
      let page = 1
      let totalPages = 1
      do {
        const result = await fetcher(page)
        all.push(...result.items)
        totalPages = result.totalPages
        page++
      } while (page <= totalPages)
      return all
    }

    const [activeItems, archivedItems] = await Promise.all([
      fetchAll((page) => fetchItems({ since: since.value, page, pageSize: PAGE_SIZE })),
      fetchAll((page) => fetchArchivedItems({ since: since.value, page, pageSize: PAGE_SIZE })),
    ])

    // Une réponse plus récente a déjà remplacé celle-ci : on ne touche plus à la carte.
    if (sequence !== loadSequence) return

    // On ne vide les marqueurs qu'après un chargement réussi : si le fetch
    // échoue, les Monstres déjà affichés restent en place au lieu de disparaître.
    markerLayer.clearLayers()
    for (const item of activeItems) addMarker(item, false)
    for (const item of archivedItems) addMarker(item, true)

    // §6.10 : zones surveillées de l'utilisateur, affichées en superposition.
    if (auth.isAuthenticated) {
      const subscriptions = await fetchSubscriptions()
      if (sequence !== loadSequence) return
      subscriptionLayer?.clearLayers()
      for (const subscription of subscriptions) {
        addSubscriptionCircle(subscription)
      }
    }
  } catch (e) {
    if (sequence !== loadSequence) return
    error.value = 'Impossible de charger les Monstres pour cette période.'
    console.error(e)
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

function addMarker(item: Item, archived: boolean) {
  const marker = L.marker([item.latitude, item.longitude], { icon: monsterIcon(archived) }).addTo(markerLayer!)
  const suffix = archived ? ' <em>(archivé)</em>' : ''
  marker.bindPopup(`<strong>${escapeHtml(item.title)}</strong>${suffix}`)
  marker.on('click', () => router.push(`/monstres/${item.id}`))
}

function addSubscriptionCircle(subscription: Subscription) {
  if (!subscriptionLayer) subscriptionLayer = L.layerGroup().addTo(map!)
  L.circle([subscription.latitude, subscription.longitude], {
    radius: subscription.radius,
    color: '#2a7877',
    weight: 2,
    fillColor: '#2a7877',
    fillOpacity: 0.1,
  })
    .addTo(subscriptionLayer)
    .bindPopup(`${escapeHtml(subscription.name)} (${subscription.radius / 1000} km)`)
}

// --- Création d'une zone d'alerte sur la carte ---

function toggleZoneMode() {
  if (!auth.isAuthenticated) {
    router.push({ path: '/connexion', query: { redirect: '/carte' } })
    return
  }
  zoneMode.value = !zoneMode.value
  zoneError.value = null
  if (!zoneMode.value) clearZonePreview()
}

function onMapClick(e: L.LeafletMouseEvent) {
  if (!zoneMode.value) return
  zoneLat.value = e.latlng.lat
  zoneLng.value = e.latlng.lng
  drawZonePreview()
}

function drawZonePreview() {
  if (!map) return
  if (!zonePreviewLayer) zonePreviewLayer = L.layerGroup().addTo(map)
  zonePreviewLayer.clearLayers()
  if (zoneLat.value === null || zoneLng.value === null) return
  const center: [number, number] = [zoneLat.value, zoneLng.value]
  L.circle(center, {
    radius: zoneRadiusKm.value * 1000,
    color: '#2a7877',
    weight: 2,
    fillColor: '#2a7877',
    fillOpacity: 0.1,
  }).addTo(zonePreviewLayer)
  L.circleMarker(center, {
    radius: 7,
    color: '#fff',
    weight: 2,
    fillColor: '#2a7877',
    fillOpacity: 1,
  }).addTo(zonePreviewLayer)
}

function clearZonePreview() {
  zonePreviewLayer?.clearLayers()
  zoneLat.value = null
  zoneLng.value = null
  zoneRadiusKm.value = 1
  zoneName.value = ''
}

async function onCreateZone() {
  if (zoneLat.value === null || zoneLng.value === null || creatingZone.value) return
  creatingZone.value = true
  zoneError.value = null
  try {
    const subscription = await createSubscription({
      name: zoneName.value.trim() || 'Ma zone',
      latitude: zoneLat.value,
      longitude: zoneLng.value,
      radius: Math.round(zoneRadiusKm.value * 1000),
    })
    addSubscriptionCircle(subscription)
    zoneMode.value = false
    clearZonePreview()
  } catch (e: any) {
    zoneError.value = e.response?.data?.error?.message ?? "Impossible d'ajouter cette zone."
  } finally {
    creatingZone.value = false
  }
}

watch(zoneRadiusKm, () => {
  if (zoneMode.value && zoneLat.value !== null) drawZonePreview()
})

// La carte se réduit en mode création pour laisser de la place aux
// explications en dessous sur smartphone. Pas de transition CSS sur la
// hauteur : Leaflet perd la main pendant l'animation et les tuiles
// disparaissent. Hauteur appliquée directement (style) + invalidateSize()
// une fois le DOM à jour.
watch(zoneMode, async () => {
  await nextTick()
  map?.invalidateSize()
})

/** Rechargement débouncé : ne part qu'une fois le curseur stabilisé. */
function scheduleReload() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadItems(), REFRESH_DEBOUNCE_MS)
}

onMounted(async () => {
  await nextTick()
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView(DEFAULT_CENTER, 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  subscriptionLayer = L.layerGroup().addTo(map)
  map.on('click', onMapClick)

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      map?.setView([position.coords.latitude, position.coords.longitude], 14)
    })
  }

  await loadItems()
})

watch(rangeIndex, () => scheduleReload())

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  map?.remove()
})</script>

<template>
  <section class="flex flex-1 flex-col p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Carte</h1>

    <div class="mt-2 flex items-center gap-2">
      <div class="min-w-0 flex-1 flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
          <label for="range-days" class="font-medium">Période affichée</label>
          <span class="tabular-nums font-semibold text-brand-600 dark:text-brand-400">{{ RANGE_LABELS[rangeIndex] }}</span>
        </div>
        <input
          id="range-days"
          v-model.number="rangeIndex"
          type="range"
          min="0"
          :max="RANGE_OPTIONS.length - 1"
          step="1"
          class="w-full accent-brand-600"
        />
        <div class="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
          <span>{{ RANGE_LABELS[0] }}</span>
          <span>{{ RANGE_LABELS[RANGE_LABELS.length - 1] }}</span>
        </div>
      </div>

      <button
        type="button"
        class="flex-shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
        :class="zoneMode
          ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          : 'bg-brand-600 text-white hover:bg-brand-700'"
        @click="toggleZoneMode"
      >
        {{ zoneMode ? '✖️ Annuler' : '🔔 Alertes Géo' }}
      </button>
    </div>

    <p v-if="loading" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Chargement des Monstres…</p>
    <p v-else-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <div
      ref="mapContainer"
      class="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-700"
      :style="{ height: zoneMode ? '35vh' : '62vh' }"
    ></div>

    <!-- Création d'une zone d'alerte directement sur la carte -->
    <div v-if="zoneMode" class="mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Clique sur la carte pour placer le centre de la zone, puis règle le rayon.
      </p>

      <div v-if="zoneLat !== null && zoneLng !== null" class="mt-3 flex flex-col gap-3">
        <input
          v-model="zoneName"
          type="text"
          placeholder="Nom du lieu (ex. Chez moi, Boulangerie…)"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          Rayon : {{ zoneRadiusKm }} km
          <input v-model.number="zoneRadiusKm" type="range" min="0.5" :max="MAX_RADIUS_KM" step="0.5" />
        </label>
        <p class="text-xs text-green-600 dark:text-green-400">
          ✓ Centre : {{ zoneLat.toFixed(5) }}, {{ zoneLng.toFixed(5) }}
        </p>
        <p v-if="zoneError" class="text-xs text-red-600 dark:text-red-400">{{ zoneError }}</p>
        <button
          type="button"
          :disabled="creatingZone"
          class="self-start rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          @click="onCreateZone"
        >
          {{ creatingZone ? 'Ajout…' : 'Ajouter cette zone' }}
        </button>
      </div>

      <p v-else class="mt-3 text-xs text-gray-400 dark:text-gray-500">
        En attendant, utilise les boutons du zoom ou déplace-toi sur la carte pour trouver l'endroit.
      </p>
    </div>
  </section>
</template>
