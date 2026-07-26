<script setup lang="ts">
import { computed, ref } from 'vue'

export interface TrendPoint {
  date: string
  views: number
  uniqueVisitors: number
}

const props = defineProps<{ points: TrendPoint[] }>()

const showTable = ref(false)

// Couleurs validées (skill dataviz) pour une paire à 2 séries — passent les
// six vérifications en clair ET en sombre (voir palette.md, slots 1 + 2).
const COLOR_VIEWS = { light: '#2a78d6', dark: '#3987e5' }
const COLOR_VISITORS = { light: '#eb6834', dark: '#d95926' }

const WIDTH = 720
const HEIGHT = 220
const PAD_LEFT = 40
const PAD_RIGHT = 12
const PAD_TOP = 12
const PAD_BOTTOM = 28
const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT
const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

const maxValue = computed(() => {
  const max = Math.max(1, ...props.points.flatMap((p) => [p.views, p.uniqueVisitors]))
  // Arrondi "propre" au-dessus (1 / 2 / 5 / 10 / 20 / 50...)
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const steps = [1, 2, 5, 10]
  for (const step of steps) {
    if (max <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
})

const yTicks = computed(() => {
  const top = maxValue.value
  return [0, top * 0.25, top * 0.5, top * 0.75, top].map((v) => Math.round(v))
})

function xFor(i: number): number {
  const n = props.points.length
  return n <= 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (i / (n - 1)) * plotWidth
}
function yFor(value: number): number {
  return PAD_TOP + plotHeight - (value / maxValue.value) * plotHeight
}

const viewsPath = computed(() =>
  props.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(p.views)}`).join(' '),
)
const visitorsPath = computed(() =>
  props.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(p.uniqueVisitors)}`).join(' '),
)

// Étiquettes X : quelques dates espacées seulement, jamais une par jour.
const xLabelIndices = computed(() => {
  const n = props.points.length
  if (n <= 1) return [0]
  const count = Math.min(6, n)
  const step = (n - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => Math.round(i * step))
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const hoverIndex = ref<number | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

function onMove(event: MouseEvent) {
  if (!svgRef.value || props.points.length === 0) return
  const rect = svgRef.value.getBoundingClientRect()
  const relX = ((event.clientX - rect.left) / rect.width) * WIDTH
  const n = props.points.length
  const ratio = n <= 1 ? 0 : Math.min(1, Math.max(0, (relX - PAD_LEFT) / plotWidth))
  hoverIndex.value = Math.round(ratio * (n - 1))
}
function onLeave() {
  hoverIndex.value = null
}

const hoverPoint = computed(() => (hoverIndex.value !== null ? props.points[hoverIndex.value] : null))
const tooltipX = computed(() => (hoverIndex.value !== null ? xFor(hoverIndex.value) : 0))
</script>

<template>
  <div class="viz-root">
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-4 text-xs">
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-0.5 w-4 rounded-full" :style="{ backgroundColor: COLOR_VIEWS.light }" />
          <span class="text-gray-600 dark:text-gray-300">Vues</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-0.5 w-4 rounded-full" :style="{ backgroundColor: COLOR_VISITORS.light }" />
          <span class="text-gray-600 dark:text-gray-300">Visiteurs uniques (jour)</span>
        </span>
      </div>
      <button
        type="button"
        class="text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
        @click="showTable = !showTable"
      >
        {{ showTable ? 'Voir le graphique' : 'Voir en tableau' }}
      </button>
    </div>

    <div v-if="!showTable" class="relative">
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        class="w-full"
        style="max-height: 240px"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <!-- Gridlines horizontales (hairline, recessives) -->
        <g class="text-gray-200 dark:text-gray-800">
          <line
            v-for="tick in yTicks"
            :key="tick"
            :x1="PAD_LEFT"
            :x2="WIDTH - PAD_RIGHT"
            :y1="yFor(tick)"
            :y2="yFor(tick)"
            stroke="currentColor"
            stroke-width="1"
          />
        </g>
        <!-- Ticks Y -->
        <g class="text-[9px] fill-gray-400 dark:fill-gray-500">
          <text v-for="tick in yTicks" :key="'l' + tick" :x="PAD_LEFT - 6" :y="yFor(tick) + 3" text-anchor="end">
            {{ tick.toLocaleString('fr-FR') }}
          </text>
        </g>
        <!-- Ticks X -->
        <g class="text-[9px] fill-gray-400 dark:fill-gray-500">
          <text
            v-for="i in xLabelIndices"
            :key="'x' + i"
            :x="xFor(i)"
            :y="HEIGHT - 8"
            text-anchor="middle"
          >
            {{ points[i] ? formatDate(points[i].date) : '' }}
          </text>
        </g>

        <!-- Crosshair -->
        <line
          v-if="hoverIndex !== null"
          :x1="tooltipX"
          :x2="tooltipX"
          :y1="PAD_TOP"
          :y2="PAD_TOP + plotHeight"
          class="stroke-gray-300 dark:stroke-gray-700"
          stroke-width="1"
        />

        <!-- Lignes -->
        <path :d="viewsPath" fill="none" :stroke="COLOR_VIEWS.light" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:hidden" />
        <path :d="viewsPath" fill="none" :stroke="COLOR_VIEWS.dark" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden dark:block" />
        <path :d="visitorsPath" fill="none" :stroke="COLOR_VISITORS.light" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:hidden" />
        <path :d="visitorsPath" fill="none" :stroke="COLOR_VISITORS.dark" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden dark:block" />

        <!-- Point survolé : anneau de surface -->
        <g v-if="hoverPoint">
          <circle :cx="tooltipX" :cy="yFor(hoverPoint.views)" r="4" :fill="COLOR_VIEWS.light" class="stroke-white dark:stroke-gray-900" stroke-width="2" />
          <circle :cx="tooltipX" :cy="yFor(hoverPoint.uniqueVisitors)" r="4" :fill="COLOR_VISITORS.light" class="stroke-white dark:stroke-gray-900" stroke-width="2" />
        </g>
      </svg>

      <!-- Tooltip -->
      <div
        v-if="hoverPoint"
        class="pointer-events-none absolute top-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-gray-700 dark:bg-gray-800"
        :style="{ left: `min(${(tooltipX / WIDTH) * 100}%, calc(100% - 130px))` }"
      >
        <p class="mb-1 font-medium text-gray-500 dark:text-gray-400">{{ formatDate(hoverPoint.date) }}</p>
        <p class="flex items-center gap-1.5">
          <span class="inline-block h-0.5 w-3 rounded-full" :style="{ backgroundColor: COLOR_VIEWS.light }" />
          <strong class="text-gray-900 dark:text-gray-100">{{ hoverPoint.views }}</strong>
          <span class="text-gray-400">vues</span>
        </p>
        <p class="flex items-center gap-1.5">
          <span class="inline-block h-0.5 w-3 rounded-full" :style="{ backgroundColor: COLOR_VISITORS.light }" />
          <strong class="text-gray-900 dark:text-gray-100">{{ hoverPoint.uniqueVisitors }}</strong>
          <span class="text-gray-400">visiteurs</span>
        </p>
      </div>
    </div>

    <div v-else class="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th class="px-2 py-1.5 text-left font-medium">Date</th>
            <th class="px-2 py-1.5 text-right font-medium">Vues</th>
            <th class="px-2 py-1.5 text-right font-medium">Visiteurs uniques</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-for="p in points" :key="p.date">
            <td class="px-2 py-1 text-gray-700 dark:text-gray-300">{{ formatDate(p.date) }}</td>
            <td class="px-2 py-1 text-right tabular-nums text-gray-900 dark:text-gray-100">{{ p.views }}</td>
            <td class="px-2 py-1 text-right tabular-nums text-gray-900 dark:text-gray-100">{{ p.uniqueVisitors }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
