<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'

const content = ref('')
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get<{ content: string }>('/legal/notices')
    content.value = data.content
  } catch {
    error.value = 'Impossible de charger les mentions légales.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="flex-1 p-4 pb-24">
    <div class="mb-4 flex items-center gap-2">
      <RouterLink to="/profil" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Retour</RouterLink>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Mentions légales</h1>
    </div>

    <p v-if="loading" class="text-sm text-gray-400">Chargement…</p>
    <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <div v-else class="prose prose-sm dark:prose-invert max-w-none prose-a:text-violet-600 dark:prose-a:text-violet-400" v-html="content" />
  </section>
</template>
