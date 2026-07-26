<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import monsterMarker from '@/assets/monster-marker.png'
import { fetchItems, fetchArchivedItems } from '@/services/items'
import { fetchSubscriptions } from '@/services/subscriptions'
import { useAuthStore } from '@/stores/auth'

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522]

const ACTIVE_SIZE = 38
const ARCHIVED_SIZE = 20 // "plus petits" sur la carte (demande utilisateur)

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

const router = useRouter()
const auth = useAuthStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const loading = ref(true)
let map: L.Map | null = null

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

onMounted(async () => {
  await nextTick()
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView(DEFAULT_CENTER, 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      map?.setView([position.coords.latitude, position.coords.longitude], 14)
    })
  }

  try {
    const [activeResult, archivedResult] = await Promise.all([
      fetchItems({ pageSize: 50 }),
      fetchArchivedItems({ pageSize: 50 }),
    ])

    for (const item of activeResult.items) {
      const marker = L.marker([item.latitude, item.longitude], { icon: monsterIcon(false) }).addTo(map!)
      marker.bindPopup(`<strong>${escapeHtml(item.title)}</strong>`)
      marker.on('click', () => router.push(`/monstres/${item.id}`))
    }

    // Archives visibles mais plus petites (demande utilisateur) — même
    // interaction (clic → détail en lecture seule).
    for (const item of archivedResult.items) {
      const marker = L.marker([item.latitude, item.longitude], { icon: monsterIcon(true) }).addTo(map!)
      marker.bindPopup(`<strong>${escapeHtml(item.title)}</strong> <em>(archivé)</em>`)
      marker.on('click', () => router.push(`/monstres/${item.id}`))
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
})

onBeforeUnmount(() => {
  map?.remove()
})
</script>

<template>
  <section class="flex flex-1 flex-col p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Carte</h1>
    <p v-if="loading" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Chargement des Monstres…</p>
    <div ref="mapContainer" class="mt-3 h-[70vh] w-full rounded-lg border border-gray-300 dark:border-gray-700"></div>
  </section>
</template>
