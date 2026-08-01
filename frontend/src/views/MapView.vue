<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import monsterMarker from '@/assets/monster-marker.png'
import { fetchItems, fetchArchivedItems, type Item } from '@/services/items'
import { fetchSubscriptions } from '@/services/subscriptions'
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

/** Plage temporelle : 1 jour à 2 ans, par défaut 7 jours (curseur de la carte). */
const MIN_DAYS = 1
const MAX_DAYS = 730
const DEFAULT_DAYS = 7
const PAGE_SIZE = 50

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

/** Libellé lisible de la plage : « 1 semaine », « 1 mois », « 6 mois », « 1 an », « 2 ans »… */
function formatRange(days: number): string {
  if (days < 7) return `${days} jour${days > 1 ? 's' : ''}`
  if (days % 365 === 0) return days === 365 ? '1 an' : `${days / 365} ans`
  if (days % 30 === 0) return days === 30 ? '1 mois' : `${days / 30} mois`
  if (days % 7 === 0) return days === 7 ? '1 semaine' : `${days / 7} semaines`
  return `${days} jours`
}

const router = useRouter()
const auth = useAuthStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const rangeDays = ref(DEFAULT_DAYS)
let map: L.Map | null = null
let markerLayer: L.LayerGroup | null = null

const since = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - rangeDays.value)
  return date.toISOString()
})

async function loadItems() {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  loading.value = true

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

    for (const item of activeItems) {
      addMarker(item, false)
    }
    for (const item of archivedItems) {
      addMarker(item, true)
    }

    // §6.10 : zones surveillées de l'utilisateur, affichées en superposition.
    if (auth.isAuthenticated) {
      const subscriptions = await fetchSubscriptions()
      for (const subscription of subscriptions) {
        L.circle([subscription.latitude, subscription.longitude], {
          radius: subscription.radius,
          color: '#2a7877',
          weight: 2,
          fillColor: '#2a7877',
          fillOpacity: 0.1,
        })
          .addTo(map!)
          .bindPopup(`${escapeHtml(subscription.name)} (${subscription.radius / 1000} km)`)
      }
    }
  } finally {
    loading.value = false
  }
}

function addMarker(item: Item, archived: boolean) {
  const marker = L.marker([item.latitude, item.longitude], { icon: monsterIcon(archived) }).addTo(markerLayer!)
  const suffix = archived ? ' <em>(archivé)</em>' : ''
  marker.bindPopup(`<strong>${escapeHtml(item.title)}</strong>${suffix}`)
  marker.on('click', () => router.push(`/monstres/${item.id}`))
}

onMounted(async () => {
  await nextTick()
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView(DEFAULT_CENTER, 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      map?.setView([position.coords.latitude, position.coords.longitude], 14)
    })
  }

  await loadItems()
})

watch(rangeDays, () => loadItems())

onBeforeUnmount(() => {
  map?.remove()
})
</script>

<template>
  <section class="flex flex-1 flex-col p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Carte</h1>

    <div class="mt-2 flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
      <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <label for="range-days" class="font-medium">Période affichée</label>
        <span class="tabular-nums font-semibold text-brand-600 dark:text-brand-400">{{ formatRange(rangeDays) }}</span>
      </div>
      <input
        id="range-days"
        v-model.number="rangeDays"
        type="range"
        :min="MIN_DAYS"
        :max="MAX_DAYS"
        :step="1"
        class="w-full accent-brand-600"
      />
      <div class="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>{{ formatRange(MIN_DAYS) }}</span>
        <span>2 ans</span>
      </div>
    </div>

    <p v-if="loading" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Chargement des Monstres…</p>
    <div ref="mapContainer" class="mt-3 h-[62vh] w-full rounded-lg border border-gray-300 dark:border-gray-700"></div>
  </section>
</template>
