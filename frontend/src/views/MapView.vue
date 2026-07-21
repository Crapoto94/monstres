<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { fetchItems } from '@/services/items'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522]

const router = useRouter()
const mapContainer = ref<HTMLDivElement | null>(null)
const loading = ref(true)
let map: L.Map | null = null

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
      const marker = L.marker([item.latitude, item.longitude]).addTo(map!)
      marker.bindPopup(`<strong>${escapeHtml(item.title)}</strong>`)
      marker.on('click', () => router.push(`/monstres/${item.id}`))
    }
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  map?.remove()
})

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}
</script>

<template>
  <section class="flex flex-1 flex-col p-4">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Carte</h1>
    <p v-if="loading" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Chargement des Monstres…</p>
    <div ref="mapContainer" class="mt-3 h-[70vh] w-full rounded-lg border border-gray-300 dark:border-gray-700"></div>
  </section>
</template>
