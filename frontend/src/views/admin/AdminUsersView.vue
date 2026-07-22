<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchAdminUsers,
  updateUserRole,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  verifyUserEmail,
  deleteUser,
  type AdminUserSummary,
} from '@/services/admin'

const auth = useAuthStore()
const users = ref<AdminUserSummary[]>([])
const loading = ref(true)
const search = ref('')
const page = ref(1)
const totalPages = ref(1)
const busyId = ref<string | null>(null)
const actionError = ref<string | null>(null)

const ROLES = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']

async function load() {
  loading.value = true
  const result = await fetchAdminUsers({ search: search.value || undefined, page: page.value })
  users.value = result.users
  totalPages.value = result.totalPages
  loading.value = false
}

onMounted(load)

function onSearch() {
  page.value = 1
  load()
}

function changePage(delta: number) {
  page.value = Math.min(totalPages.value, Math.max(1, page.value + delta))
  load()
}

async function withBusy(id: string, action: () => Promise<unknown>) {
  busyId.value = id
  actionError.value = null
  try {
    await action()
    await load()
  } catch (e: any) {
    actionError.value = e.response?.data?.error?.message ?? 'Action impossible.'
  } finally {
    busyId.value = null
  }
}

function onRoleChange(user: AdminUserSummary, event: Event) {
  const role = (event.target as HTMLSelectElement).value
  withBusy(user.id, () => updateUserRole(user.id, role))
}

function onToggleSuspend(user: AdminUserSummary) {
  withBusy(user.id, () => (user.suspendedAt ? unsuspendUser(user.id) : suspendUser(user.id)))
}

function onToggleBan(user: AdminUserSummary) {
  if (!user.bannedAt && !confirm(`Bannir ${user.name} ? Ce compte ne pourra plus se connecter.`)) return
  withBusy(user.id, () => (user.bannedAt ? unbanUser(user.id) : banUser(user.id)))
}

function onDelete(user: AdminUserSummary) {
  if (!confirm(`Supprimer définitivement le compte de ${user.name} ? Cette action est irréversible.`)) return
  withBusy(user.id, () => deleteUser(user.id))
}

function onVerifyEmail(user: AdminUserSummary) {
  withBusy(user.id, () => verifyUserEmail(user.id))
}

function isSelf(user: AdminUserSummary): boolean {
  return user.id === auth.user?.id
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

    <p v-if="actionError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>

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
            :class="user.avatar && (user.avatar.startsWith('/') || user.avatar.startsWith('http')) ? '' : 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'"
          >
            <img v-if="user.avatar && (user.avatar.startsWith('/') || user.avatar.startsWith('http'))" :src="user.avatar" class="h-10 w-10 rounded-full object-cover" alt="" />
            <span v-else>{{ user.avatar ?? user.name.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate font-semibold text-gray-900 dark:text-gray-100">{{ user.name }}</p>
              <span v-if="isSelf(user)" class="text-[10px] text-gray-400">(vous)</span>
            </div>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ user.email }}</p>
          </div>
          <div class="flex flex-shrink-0 flex-col items-end gap-1">
            <span v-if="user.bannedAt" class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
              Banni
            </span>
            <span v-else-if="user.suspendedAt" class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Suspendu
            </span>
            <span v-if="!user.emailVerifiedAt" class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Email non vérifié
            </span>
          </div>
        </div>

        <!-- Métriques -->
        <div class="grid grid-cols-4 gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ user.score }}</p>
            <p class="text-[10px] text-gray-400">Score</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ user.trustScore }}</p>
            <p class="text-[10px] text-gray-400">Confiance</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ user._count.items }}</p>
            <p class="text-[10px] text-gray-400">Monstres</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ user.loginCount }}</p>
            <p class="text-[10px] text-gray-400">Connexions</p>
          </div>
          <div class="text-center">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ user.reportsSubmitted }}</p>
            <p class="text-[10px] text-gray-400">Signalements</p>
          </div>
        </div>

        <!-- Infos détaillées -->
        <div class="space-y-1 border-t border-gray-100 px-3 py-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <p>📅 Inscrit le {{ formatDate(user.createdAt) }}</p>
          <p v-if="user.registrationOs || user.registrationBrowser">
            📱 Device inscription : {{ user.registrationOs }} · {{ user.registrationBrowser }}
          </p>
          <p v-if="user.registrationIp">🌐 IP inscription : {{ user.registrationIp }}</p>
          <p v-if="user.lastLoginAt">
            🔑 Dernière connexion : {{ formatDateTime(user.lastLoginAt) }}
          </p>
          <p v-else>🔑 Jamais connecté</p>
          <p v-if="user.lastLoginOs || user.lastLoginBrowser">
            📱 Dernier device : {{ user.lastLoginOs }} · {{ user.lastLoginBrowser }}
          </p>
          <p v-if="user.lastLoginIp">🌐 Dernière IP : {{ user.lastLoginIp }}</p>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
          <select
            :value="user.role"
            :disabled="busyId === user.id || !auth.isAdmin || isSelf(user)"
            :title="isSelf(user) ? 'Tu ne peux pas modifier ton propre rôle.' : ''"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
            @change="onRoleChange(user, $event)"
          >
            <option v-for="role in ROLES" :key="role" :value="role">{{ role }}</option>
          </select>

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
            {{ user.suspendedAt ? 'Lever la suspension' : 'Suspendre' }}
          </button>

          <button
            type="button"
            :disabled="busyId === user.id || isSelf(user)"
            class="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-700"
            @click="onToggleBan(user)"
          >
            {{ user.bannedAt ? 'Débannir' : 'Bannir' }}
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
      <span class="text-gray-500 dark:text-gray-400">Page {{ page }} / {{ totalPages }}</span>
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
