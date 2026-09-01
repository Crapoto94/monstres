<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  fetchAdminUsers,
  updateUserRole,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  verifyUserEmail,
  deleteUser,
  updateUserProfile,
  updateUserAvatar,
  uploadUserAvatar,
  type AdminUserSummary,
} from "@/services/admin";

const auth = useAuthStore();
const users = ref<AdminUserSummary[]>([]);
const loading = ref(true);
const search = ref("");
const page = ref(1);
const totalPages = ref(1);
const busyId = ref<string | null>(null);
const actionError = ref<string | null>(null);

const ROLES = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

async function load() {
  loading.value = true;
  const result = await fetchAdminUsers({
    search: search.value || undefined,
    page: page.value,
  });
  users.value = result.users;
  totalPages.value = result.totalPages;
  loading.value = false;
}

onMounted(load);

function onSearch() {
  page.value = 1;
  load();
}

function changePage(delta: number) {
  page.value = Math.min(totalPages.value, Math.max(1, page.value + delta));
  load();
}

async function withBusy(id: string, action: () => Promise<unknown>) {
  busyId.value = id;
  actionError.value = null;
  try {
    await action();
    await load();
  } catch (e: any) {
    actionError.value =
      e.response?.data?.error?.message ?? "Action impossible.";
  } finally {
    busyId.value = null;
  }
}

function onRoleChange(user: AdminUserSummary, event: Event) {
  const role = (event.target as HTMLSelectElement).value;
  withBusy(user.id, () => updateUserRole(user.id, role));
}

function onToggleSuspend(user: AdminUserSummary) {
  withBusy(user.id, () =>
    user.suspendedAt ? unsuspendUser(user.id) : suspendUser(user.id),
  );
}

function onToggleBan(user: AdminUserSummary) {
  if (
    !user.bannedAt &&
    !confirm(`Bannir ${user.name} ? Ce compte ne pourra plus se connecter.`)
  )
    return;
  withBusy(user.id, () =>
    user.bannedAt ? unbanUser(user.id) : banUser(user.id),
  );
}

function onDelete(user: AdminUserSummary) {
  if (
    !confirm(
      `Supprimer définitivement le compte de ${user.name} ? Cette action est irréversible.`,
    )
  )
    return;
  withBusy(user.id, () => deleteUser(user.id));
}

function onVerifyEmail(user: AdminUserSummary) {
  withBusy(user.id, () => verifyUserEmail(user.id));
}

// Édition d'un compte (nom, email, avatar) par un admin.
const editingUser = ref<AdminUserSummary | null>(null)
const editName = ref("")
const editEmail = ref("")
const editAvatarEmoji = ref("")
const editAvatarFile = ref<File | null>(null)
const savingEdit = ref(false)
const editError = ref<string | null>(null)

function isPhotoAvatar(avatar: string | null): boolean {
  return !!avatar && (avatar.startsWith("/") || avatar.startsWith("http"))
}

function onEdit(user: AdminUserSummary) {
  editError.value = null
  editingUser.value = user
  editName.value = user.name
  editEmail.value = user.email
  editAvatarEmoji.value = isPhotoAvatar(user.avatar) ? "" : (user.avatar ?? "")
  editAvatarFile.value = null
}

function onAvatarFileChange(event: Event) {
  editAvatarFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

// Appeler URL.createObjectURL() directement dans le template le fait résoudre
// comme une propriété du composant par vue-tsc (échec de build) plutôt que
// comme le global JS — on passe donc par un computed exposé au template.
const editAvatarPreviewUrl = computed(() =>
  editAvatarFile.value ? URL.createObjectURL(editAvatarFile.value) : null,
)

async function onSaveEdit() {
  if (!editingUser.value) return
  const user = editingUser.value
  savingEdit.value = true
  editError.value = null
  try {
    const profileChanges: { name?: string; email?: string } = {}
    if (editName.value.trim() && editName.value.trim() !== user.name) {
      profileChanges.name = editName.value.trim()
    }
    if (editEmail.value.trim() && editEmail.value.trim() !== user.email) {
      profileChanges.email = editEmail.value.trim()
    }
    if (Object.keys(profileChanges).length > 0) {
      await updateUserProfile(user.id, profileChanges)
    }

    if (editAvatarFile.value) {
      await uploadUserAvatar(user.id, editAvatarFile.value)
    } else if (editAvatarEmoji.value !== (isPhotoAvatar(user.avatar) ? "" : (user.avatar ?? ""))) {
      await updateUserAvatar(user.id, editAvatarEmoji.value.trim() || null)
    }

    editingUser.value = null
    await load()
  } catch (e: any) {
    editError.value = e.response?.data?.error?.message ?? "Enregistrement impossible."
  } finally {
    savingEdit.value = false
  }
}

function isSelf(user: AdminUserSummary): boolean {
  return user.id === auth.user?.id;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
    <div class="flex gap-2">
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher (pseudo, email)"
        class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        @keyup.enter="onSearch"
      />
      <button
        type="button"
        class="flex-shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white"
        @click="onSearch"
      >
        Chercher
      </button>
    </div>

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">
      {{ actionError }}
    </p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
      Chargement…
    </p>

    <ul v-else class="mt-4 flex flex-col gap-3">
      <li
        v-for="user in users"
        :key="user.id"
        class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <!-- Header : avatar + noms + badges -->
        <div class="flex items-start gap-3 p-3">
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm"
            :class="
              user.avatar &&
              (user.avatar.startsWith('/') || user.avatar.startsWith('http'))
                ? ''
                : 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
            "
          >
            <img
              v-if="
                user.avatar &&
                (user.avatar.startsWith('/') || user.avatar.startsWith('http'))
              "
              :src="user.avatar"
              class="h-10 w-10 rounded-full object-cover"
              alt=""
            />
            <span v-else>{{
              user.avatar ?? user.name.charAt(0).toUpperCase()
            }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p
                class="truncate font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ user.name }}
              </p>
              <span v-if="isSelf(user)" class="text-[10px] text-gray-400"
                >(vous)</span
              >
            </div>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ user.email }}
            </p>
          </div>
          <div class="flex flex-shrink-0 flex-col items-end gap-1">
            <span
              v-if="user.bannedAt"
              class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              Banni
            </span>
            <span
              v-else-if="user.suspendedAt"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            >
              Suspendu
            </span>
            <span
              v-if="!user.emailVerifiedAt"
              class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              Email non vérifié
            </span>
          </div>
        </div>

        <!-- Métriques -->
        <div
          class="grid grid-cols-4 gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800"
        >
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user.score }}
            </p>
            <p class="text-[10px] text-gray-400">Score</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user.trustScore }}
            </p>
            <p class="text-[10px] text-gray-400">Confiance</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user._count.items }}
            </p>
            <p class="text-[10px] text-gray-400">Monstres</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user.loginCount }}
            </p>
            <p class="text-[10px] text-gray-400">Connexions</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user.reportsSubmitted }}
            </p>
            <p class="text-[10px] text-gray-400">Signalements</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user._count.comments }}
            </p>
            <p class="text-[10px] text-gray-400">Commentaires</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user._count.subscriptions }}
            </p>
            <p class="text-[10px] text-gray-400">Zones d'alerte</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ user._count.notifications }}
            </p>
            <p class="text-[10px] text-gray-400">Mails d'alerte</p>
          </div>
        </div>

        <!-- Infos détaillées -->
        <div
          class="space-y-1 border-t border-gray-100 px-3 py-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400"
        >
          <p>📅 Inscrit le {{ formatDate(user.createdAt) }}</p>
          <p v-if="user.registrationOs || user.registrationBrowser">
            📱 Device inscription : {{ user.registrationOs }} ·
            {{ user.registrationBrowser }}
          </p>
          <p v-if="user.registrationIp">
            🌐 IP inscription : {{ user.registrationIp }}
          </p>
          <p v-if="user.lastLoginAt">
            🔑 Dernière connexion : {{ formatDateTime(user.lastLoginAt) }}
          </p>
          <p v-else>🔑 Jamais connecté</p>
          <p v-if="user.lastLoginOs || user.lastLoginBrowser">
            📱 Dernier device : {{ user.lastLoginOs }} ·
            {{ user.lastLoginBrowser }}
          </p>
          <p v-if="user.lastLoginIp">🌐 Dernière IP : {{ user.lastLoginIp }}</p>
        </div>

        <!-- Actions -->
        <div
          class="flex flex-wrap gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800"
        >
          <select
            :value="user.role"
            :disabled="busyId === user.id || !auth.isAdmin || isSelf(user)"
            :title="
              isSelf(user) ? 'Tu ne peux pas modifier ton propre rôle.' : ''
            "
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
            @change="onRoleChange(user, $event)"
          >
            <option v-for="role in ROLES" :key="role" :value="role">
              {{ role }}
            </option>
          </select>

          <button
            type="button"
            :disabled="busyId === user.id"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="onEdit(user)"
          >
            Modifier
          </button>

          <button
            v-if="!user.emailVerifiedAt"
            type="button"
            :disabled="busyId === user.id"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-700"
            @click="onVerifyEmail(user)"
          >
            Valider email
          </button>

          <button
            type="button"
            :disabled="busyId === user.id || isSelf(user)"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-700"
            @click="onToggleSuspend(user)"
          >
            {{ user.suspendedAt ? "Lever la suspension" : "Suspendre" }}
          </button>

          <button
            type="button"
            :disabled="busyId === user.id || isSelf(user)"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-700"
            @click="onToggleBan(user)"
          >
            {{ user.bannedAt ? "Débannir" : "Bannir" }}
          </button>

          <button
            type="button"
            :disabled="busyId === user.id || isSelf(user)"
            class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
            @click="onDelete(user)"
          >
            Supprimer
          </button>
        </div>
      </li>
    </ul>

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

    <!-- Modale d'édition d'un compte (nom, email, avatar) -->
    <Teleport to="body">
      <div
        v-if="editingUser"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-4"
      >
        <div class="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-4 shadow-xl dark:bg-gray-900">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Modifier le compte</h2>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              @click="editingUser = null"
            >
              ✕
            </button>
          </div>

          <div class="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto text-sm">
            <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              Nom / pseudo
              <input
                v-model="editName"
                type="text"
                maxlength="50"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              Email
              <input
                v-model="editEmail"
                type="email"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <span class="text-[10px] text-gray-400">Changer l'email repasse le compte en « non vérifié » et envoie un lien de confirmation.</span>
            </label>

            <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-2 dark:border-gray-800">
              <img
                v-if="editAvatarPreviewUrl"
                :src="editAvatarPreviewUrl"
                class="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                alt=""
              />
              <img
                v-else-if="isPhotoAvatar(editingUser.avatar)"
                :src="editingUser.avatar!"
                class="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                alt=""
              />
              <div
                v-else
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700 dark:bg-brand-900 dark:text-brand-300"
              >
                {{ editAvatarEmoji || editName.charAt(0).toUpperCase() }}
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  v-model="editAvatarEmoji"
                  type="text"
                  maxlength="10"
                  placeholder="Emoji (ex. 🦊)"
                  :disabled="!!editAvatarFile"
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900"
                />
                <input
                  type="file"
                  accept="image/*"
                  class="text-xs text-gray-500 dark:text-gray-400"
                  @change="onAvatarFileChange"
                />
              </div>
            </div>

            <p v-if="editError" class="text-xs text-red-600 dark:text-red-400">{{ editError }}</p>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="editingUser = null"
            >
              Annuler
            </button>
            <button
              type="button"
              :disabled="savingEdit"
              class="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              @click="onSaveEdit"
            >
              {{ savingEdit ? "Enregistrement…" : "Enregistrer" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
