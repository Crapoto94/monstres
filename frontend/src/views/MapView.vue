<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { fetchItems } from '@/services/items'
import { fetchSubscriptions } from '@/services/subscriptions'
import { useAuthStore } from '@/stores/auth'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522]

// Couleurs alignées sur les badges de statut de HomeView.vue.
const STATUS_COLORS: Record<string, string> = {
  RESERVED: '#f59e0b', // amber-500
  COLLECTED: '#22c55e', // green-500
}
const DEFAULT_COLOR = '#7c3aed' // violet-600 (AVAILABLE)

function statusIcon(status: string): L.DivIcon {
  const color = STATUS_COLORS[status] ?? DEFAULT_COLOR
  return L.divIcon({
    className: '',
    html: `<span style="background:${color}" class="block h-4 w-4 rounded-full border-2 border-white shadow-md"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
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
    const result = await fetchItems({ pageSize: 50 })
    for (const item of result.items) {
      const marker = L.marker([item.latitude, item.longitude], { icon: statusIcon(item.status) }).addTo(map!)
      marker.bindPopup(`<strong>${escapeHtml(item.title)}</strong>`)
      marker.on('click', () => router.push(`/monstres/${item.id}`))
    }

    // §6.10 : zones surveillées de l'utilisateur, affichées en superposition.
    if (auth.isAuthenticated) {
      const subscriptions = await fetchSubscriptions()
      for (const subscription of subscriptions) {
        L.circle([subscription.latitude, subscription.longitude], {
          radius: subscription.radius,
          color: '#7c3aed',
          weight: 2,
          fillColor: '#7c3aed',
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
