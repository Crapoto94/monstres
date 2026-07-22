<script setup lang="ts">
import { ref, watch } from 'vue'
import { changelog } from '@/data/changelog'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const expandedVersion = ref<string | null>(changelog[0]?.version ?? null)

watch(() => props.open, (val) => {
  if (val) expandedVersion.value = changelog[0]?.version ?? null
})

function toggle(version: string) {
  expandedVersion.value = expandedVersion.value === version ? null : version
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center" @click.self="emit('close')">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

        <!-- Panel -->
        <div class="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900 sm:rounded-2xl">
          <!-- Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Nouveautés</h2>
              <p class="text-xs text-gray-400 dark:text-gray-500">Version actuelle : v{{ changelog[0]?.version }}</p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- Timeline -->
          <div class="px-5 py-4">
            <div v-for="(entry, i) in changelog" :key="entry.version" class="relative flex gap-4">
              <!-- Timeline line -->
              <div class="flex flex-col items-center">
                <div
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :class="i === 0 ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'"
                >
                  v{{ entry.version.split('.').slice(0, 2).join('.') }}
                </div>
                <div v-if="i < changelog.length - 1" class="w-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>

              <!-- Content -->
              <div class="flex-1 pb-6">
                <button
                  type="button"
                  class="flex w-full items-baseline gap-2 text-left"
                  @click="toggle(entry.version)"
                >
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">v{{ entry.version }}</span>
                  <span class="text-xs text-gray-400 dark:text-gray-500">{{ entry.date }}</span>
                  <span class="ml-auto text-xs text-gray-400 dark:text-gray-500">
                    {{ expandedVersion === entry.version ? '▾' : '▸' }}
                  </span>
                </button>

                <Transition name="slide">
                  <ul v-if="expandedVersion === entry.version" class="mt-2 flex flex-col gap-1.5">
                    <li
                      v-for="(change, j) in entry.changes"
                      :key="j"
                      class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                      {{ change }}
                    </li>
                  </ul>
                </Transition>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: all 0.2s ease-out;
  overflow: hidden;
}
.slide-leave-active {
  transition: all 0.15s ease-in;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
