<script setup lang="ts">
import { computed } from 'vue'

interface Row {
  label: string
  count: number
}

const props = defineProps<{ rows: Row[]; emptyLabel?: string }>()

const maxCount = computed(() => Math.max(1, ...props.rows.map((r) => r.count)))
</script>

<template>
  <ul class="flex flex-col gap-1.5">
    <li v-for="row in rows" :key="row.label" class="flex items-center gap-2 text-xs">
      <span class="w-24 flex-shrink-0 truncate text-gray-600 dark:text-gray-300" :title="row.label">{{ row.label }}</span>
      <span class="h-4 flex-1 overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800">
        <span
          class="block h-full rounded-sm bg-[#2a78d6] dark:bg-[#3987e5]"
          :style="{ width: `${(row.count / maxCount) * 100}%` }"
        />
      </span>
      <span class="w-10 flex-shrink-0 text-right tabular-nums text-gray-900 dark:text-gray-100">{{ row.count }}</span>
    </li>
    <li v-if="rows.length === 0" class="text-xs text-gray-400 dark:text-gray-500">
      {{ emptyLabel ?? 'Aucune donnée sur cette période.' }}
    </li>
  </ul>
</template>
