<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api, type ApiSuccess } from '@/services/api'

interface TutorialPage {
  id: string
  order: number
  title: string
  content: string
  icon: string | null
  active: boolean
}

const router = useRouter()
const auth = useAuthStore()

const pages = ref<TutorialPage[]>([])
const currentIndex = ref(0)
const loading = ref(true)
const completing = ref(false)

const currentPage = () => pages.value[currentIndex.value]
const isFirst = () => currentIndex.value === 0
const isLast = () => currentIndex.value === pages.value.length - 1

function next() {
  if (isLast()) {
    complete()
  } else {
    currentIndex.value++
  }
}

function prev() {
  if (!isFirst()) currentIndex.value--
}

async function complete() {
  completing.value = true
  try {
    await api.post<ApiSuccess<{ completed: boolean }>>('/tutorial/complete')
    auth.setOnboardingCompleted()
    router.push('/')
  } catch {
    router.push('/')
  } finally {
    completing.value = false
  }
}

function skip() {
  complete()
}

onMounted(async () => {
  try {
    const { data } = await api.get<ApiSuccess<TutorialPage[]>>('/tutorial')
    pages.value = data.data.filter((p) => p.active).sort((a, b) => a.order - b.order)
    if (pages.value.length === 0) {
      await complete()
    }
  } catch {
    router.push('/')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-white px-6 dark:from-gray-900 dark:to-gray-950">
    <template v-if="loading">
      <p class="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    </template>

    <template v-else-if="currentPage()">
      <!-- Progress -->
      <div class="mb-8 flex gap-2">
        <div
          v-for="(_, i) in pages"
          :key="i"
          class="h-1.5 w-8 rounded-full transition-colors"
          :class="i === currentIndex ? 'bg-violet-600' : i < currentIndex ? 'bg-violet-300 dark:bg-violet-700' : 'bg-gray-200 dark:bg-gray-700'"
        />
      </div>

      <!-- Icon -->
      <div class="mb-6 text-6xl">{{ currentPage().icon }}</div>

      <!-- Title -->
      <h1 class="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
        {{ currentPage().title }}
      </h1>

      <!-- Content -->
      <div
        class="prose prose-violet mt-6 max-w-md text-center text-gray-600 dark:text-gray-400 prose-p:my-2 prose-li:my-1"
        v-html="currentPage().content"
      />

      <!-- Navigation -->
      <div class="mt-10 flex w-full max-w-md flex-col items-center gap-3">
        <button
          type="button"
          :disabled="completing"
          class="w-full rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
          @click="next"
        >
          {{ isLast() ? 'Commencer' : 'Suivant' }}
        </button>

        <button
          v-if="!isLast()"
          type="button"
          :disabled="completing"
          class="text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          @click="skip"
        >
          Passer
        </button>

        <button
          v-if="!isFirst()"
          type="button"
          :disabled="completing"
          class="mt-2 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          @click="prev"
        >
          ← Précédent
        </button>
      </div>
    </template>
  </div>
</template>
