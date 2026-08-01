<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  fetchAdminComments,
  deleteComment,
  type AdminCommentEntry,
} from "@/services/admin";
import { linkify } from "@/utils/linkify";

const comments = ref<AdminCommentEntry[]>([]);
const loading = ref(true);
const page = ref(1);
const totalPages = ref(1);
const busyId = ref<string | null>(null);
const actionError = ref<string | null>(null);

async function load() {
  loading.value = true;
  try {
    const result = await fetchAdminComments({ page: page.value });
    comments.value = result.comments;
    totalPages.value = result.totalPages;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function changePage(delta: number) {
  page.value = Math.min(totalPages.value, Math.max(1, page.value + delta));
  load();
}

async function onDelete(comment: AdminCommentEntry) {
  if (
    !confirm(
      `Supprimer le commentaire de ${comment.user?.name ?? "un·e utilisateur·ice"} ?`,
    )
  )
    return;
  busyId.value = comment.id;
  actionError.value = null;
  try {
    await deleteComment(comment.id);
    comments.value = comments.value.filter((c) => c.id !== comment.id);
  } catch (e: any) {
    actionError.value =
      e.response?.data?.error?.message ?? "Action impossible.";
  } finally {
    busyId.value = null;
  }
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Tous les commentaires classés par date. Modération : supprimer un
      commentaire inapproprié.
    </p>

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">
      {{ actionError }}
    </p>
    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      Chargement…
    </p>

    <ul v-else-if="comments.length" class="mt-4 flex flex-col gap-3">
      <li
        v-for="comment in comments"
        :key="comment.id"
        class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p
                class="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200"
              >
                <span v-html="linkify(comment.content)" />
              </p>
              <p class="mt-2 text-xs text-gray-400">
                <RouterLink
                  v-if="comment.item"
                  :to="`/monstres/${comment.itemId}`"
                  class="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {{ comment.item.title }}
                </RouterLink>
                <span v-else class="italic">Monstre supprimé</span>
                <span class="mx-1">·</span>
                <span>{{ formatDateTime(comment.createdAt) }}</span>
                <span class="mx-1">·</span>
                <span v-if="comment.user">{{ comment.user.name }}</span>
                <span v-else class="italic text-gray-400"
                  >Utilisateur·ice parti·e</span
                >
              </p>
            </div>
            <button
              type="button"
              :disabled="busyId === comment.id"
              class="flex-shrink-0 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
              @click="onDelete(comment)"
            >
              {{ busyId === comment.id ? "…" : "Supprimer" }}
            </button>
          </div>
        </div>
      </li>
    </ul>

    <p v-else class="mt-4 text-sm text-gray-400 dark:text-gray-500">
      Aucun commentaire.
    </p>

    <div v-if="!loading" class="mt-4 flex items-center justify-between text-sm">
      <button
        type="button"
        :disabled="page <= 1"
        class="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
        @click="changePage(-1)"
      >
        Précédent
      </button>
      <span class="text-gray-500 dark:text-gray-400"
        >Page {{ page }} / {{ totalPages }}</span
      >
      <button
        type="button"
        :disabled="page >= totalPages"
        class="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
        @click="changePage(1)"
      >
        Suivant
      </button>
    </div>
  </div>
</template>
