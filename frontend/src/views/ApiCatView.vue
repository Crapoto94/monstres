<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchCategories, type Category } from '@/services/categories'

const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

async function load() {
  loading.value = true
  error.value = null
  try {
    categories.value = await fetchCategories()
  } catch (e: any) {
    error.value = e.response?.data?.error?.message ?? 'Impossible de charger les catégories.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const curlExample = (categoryId: string) => `curl -X POST ${apiBase}/items \\
  -b "access_token=<TON_JWT>" \\
  -F "title=Canapé vintage" \\
  -F "latitude=48.8566" \\
  -F "longitude=2.3522" \\
  -F "categoryId=${categoryId}" \\
  -F "photos=@photo.jpg"`

const curlImportExample = `curl -X POST ${apiBase}/import/facebook \\
  -H "x-import-token: <IMPORT_API_TOKEN>" \\
  -F "postId=FB_POST_ID" \\
  -F "title=Canapé vintage" \\
  -F "address=10 rue de Rivoli, Paris" \\
  -F "categoryName=Canapés" \\
  -F "categoryIcon=🛋️" \\
  -F "photos=@photo.jpg"`
</script>

<template>
  <section class="flex-1 p-4 pb-24">
    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">API — Catégories</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Page technique (accès direct par <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">/apicat</code>).
      Liste des catégories et exemple pour publier un Monstre avec une catégorie.
    </p>

    <h2 class="mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">Catégories</h2>
    <p v-if="loading" class="mt-2 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
    <div v-else-if="error" class="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
      <p>{{ error }}</p>
      <button type="button" class="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400" @click="load">
        Réessayer
      </button>
    </div>
    <ul v-else class="mt-2 flex flex-col gap-2">
      <li
        v-for="category in categories"
        :key="category.id"
        class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="font-medium text-gray-900 dark:text-gray-100">{{ category.name }}</p>
          <span class="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{{ category.icon }}</span>
        </div>
        <p class="mt-1 break-all font-mono text-xs text-gray-500 dark:text-gray-400">{{ category.id }}</p>
      </li>
    </ul>

    <h2 class="mt-8 text-sm font-semibold text-gray-900 dark:text-gray-100">
      Publier un Monstre avec une catégorie
    </h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      L'API de création est
      <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">POST /api/v1/items</code>
      (multipart/form-data, cookie JWT requis). Le champ optionnel
      <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">categoryId</code>
      associe le Monstre à une catégorie. Champ manquant → Monstre sans catégorie.
    </p>

    <h3 class="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Exemple</h3>
    <pre
      class="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100"
    >{{ curlExample(categories[0]?.id ?? '<ID_CATEGORIE>') }}</pre>
    <p v-if="categories.length === 0" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
      Aucune catégorie chargée — remplace <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">&lt;ID_CATEGORIE&gt;</code> par l'id d'une catégorie.
    </p>

    <h2 class="mt-8 text-sm font-semibold text-gray-900 dark:text-gray-100">
      Ajouter une catégorie via l'import Facebook
    </h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      L'endpoint
      <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">POST /api/v1/import/facebook</code>
      (token
      <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">x-import-token</code>, multipart/form-data)
      accepte une catégorie par Monstre importé. Deux façons :
    </p>
    <ul class="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-gray-500 dark:text-gray-400">
      <li>
        <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">categoryId</code>
        : catégorie existante à rattacher (erreur si l'id est inconnu) ;
      </li>
      <li>
        <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">categoryName</code>
        : si aucune catégorie ne porte ce nom, elle est
        <strong class="font-medium text-gray-900 dark:text-gray-100">créée automatiquement</strong>
        (optionnellement avec <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">categoryIcon</code>)
        puis rattachée — c'est le seul moyen pour la routine d'import d'ajouter une catégorie,
        car elle n'a pas accès à l'admin. Une catégorie déjà existante est simplement réutilisée.
      </li>
    </ul>

    <h3 class="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Exemple — catégorie créée au passage</h3>
    <pre
      class="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100"
    >{{ curlImportExample }}</pre>
    <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
      <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">categoryId</code> est prioritaire :
      si les deux champs sont envoyés, seul l'id est utilisé.
    </p>
  </section>
</template>
