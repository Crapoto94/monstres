<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchDashboardStats, type DashboardStats } from "@/services/admin";

const route = useRoute();

const auth = useAuthStore();
const stats = ref<DashboardStats | null>(null);

onMounted(async () => {
  try {
    stats.value = await fetchDashboardStats();
  } catch {
    // Silently fail — stats are optional badges
  }
});

const tabs = computed(() => [
  ...(auth.isAdmin
    ? [
        {
          to: "/admin",
          label: "Dashboard",
          exact: true,
          badge: null as number | null,
        },
        {
          to: "/admin/utilisateurs",
          label: "Utilisateurs",
          badge: stats.value?.users.total ?? null,
        },
        {
          to: "/admin/monstres",
          label: "Monstres",
          badge: stats.value?.items.available ?? null,
        },
        { to: "/admin/categories", label: "Catégories", badge: null },
        { to: "/admin/tutoriel", label: "Tutoriel", badge: null },
        { to: "/admin/mails", label: "Mails", badge: null },
        { to: "/admin/newsletter", label: "Newsletter", badge: null },
        { to: "/admin/parametres", label: "Paramètres", badge: null },
        { to: "/admin/journal-import", label: "Journal import", badge: null },
        { to: "/admin/commentaires", label: "Commentaires", badge: null },
        { to: "/admin/statistiques", label: "Statistiques", badge: null },
      ]
    : []),
  {
    to: "/admin/signalements",
    label: "Signalements",
    badge: stats.value?.pendingReports ?? null,
  },
  ...(auth.user?.role === "SUPER_ADMIN"
    ? [
        {
          to: "/admin/journal",
          label: "Journal",
          badge: null as number | null,
        },
        {
          to: "/admin/journal-mails",
          label: "Journal mails",
          badge: null as number | null,
        },
        {
          to: "/admin/journal-whatsapp",
          label: "Journal WhatsApp",
          badge: null as number | null,
        },
        {
          to: "/admin/sql",
          label: "Console SQL",
          badge: null as number | null,
        },
        {
          to: "/admin/sauvegardes",
          label: "Sauvegardes",
          badge: null as number | null,
        },
        {
          to: "/admin/fichiers",
          label: "Fichiers",
          badge: null as number | null,
        },
      ]
    : []),
]);

function isActive(tab: { to: string; exact?: boolean }) {
  return tab.exact ? route.path === tab.to : route.path.startsWith(tab.to);
}
</script>

<template>
  <div class="flex min-w-0 flex-1">
    <!-- Sidebar desktop (lg+) : sticky, ne bouge pas -->
    <aside
      class="hidden lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-48 lg:flex-col lg:border-r lg:border-gray-800 lg:bg-gray-950"
    >
      <div class="flex items-center gap-2 px-3 py-3">
        <RouterLink to="/" class="text-xl font-bold text-violet-400"
          >👹</RouterLink
        >
        <h2 class="text-xs font-semibold text-gray-100">Admin</h2>
      </div>
      <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-3">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors"
          :class="
            isActive(tab)
              ? 'bg-violet-600/20 font-semibold text-violet-300'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          "
        >
          <span class="flex-1 truncate">{{ tab.label }}</span>
          <span
            v-if="tab.badge !== null && tab.badge !== undefined"
            class="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
            :class="
              isActive(tab)
                ? 'bg-violet-500/30 text-violet-300'
                : tab.badge > 0 && tab.label === 'Signalements'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-800 text-gray-400'
            "
          >
            {{ tab.badge }}
          </span>
        </RouterLink>
      </nav>
      <div class="border-t border-gray-800 px-3 py-2">
        <RouterLink to="/" class="text-[11px] text-gray-500 hover:text-gray-300"
          >← Accueil</RouterLink
        >
        <RouterLink
          to="/profil"
          class="ml-3 text-[11px] text-gray-500 hover:text-gray-300"
          >← Profil</RouterLink
        >
      </div>
    </aside>

    <!-- Main content : seule partie scrollable -->
    <div class="flex min-w-0 flex-1 flex-col">
      <section class="min-w-0 flex-1 p-2 lg:p-3">
        <!-- Header mobile -->
        <div class="flex items-center gap-3 lg:hidden">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Administration
          </h1>
          <RouterLink
            to="/"
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >← Accueil</RouterLink
          >
        </div>

        <!-- Tabs mobile (scrollable) -->
        <nav class="mt-3 flex gap-1 overflow-x-auto text-sm lg:hidden">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            class="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5"
            :class="
              isActive(tab)
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            "
          >
            {{ tab.label }}
            <span
              v-if="tab.badge !== null && tab.badge !== undefined"
              class="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
              :class="
                isActive(tab)
                  ? 'bg-white/20 text-white'
                  : tab.badge > 0 && tab.label === 'Signalements'
                    ? 'bg-red-500 text-white'
                    : 'bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-200'
              "
            >
              {{ tab.badge }}
            </span>
          </RouterLink>
        </nav>

        <div class="mt-2 lg:mt-3">
          <RouterView />
        </div>
      </section>
    </div>
  </div>
</template>
