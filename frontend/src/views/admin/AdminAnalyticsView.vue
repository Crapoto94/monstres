<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { fetchAnalyticsSummary, type AnalyticsSummary } from "@/services/admin";
import TrendLineChart from "@/components/admin/TrendLineChart.vue";
import BreakdownBarChart from "@/components/admin/BreakdownBarChart.vue";

const RANGES = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
];

const selectedDays = ref(30);
const summary = ref<AnalyticsSummary | null>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    summary.value = await fetchAnalyticsSummary(selectedDays.value);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(selectedDays, load);

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablette",
  desktop: "Ordinateur",
};
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Consultations du site : qui consulte, depuis quel appareil et quel pays.
        Données anonymisées — voir
        <RouterLink to="/rgpd" class="underline">/rgpd</RouterLink>.
      </p>
      <!-- Filtre de période : une seule ligne, au-dessus de tout ce qu'il contrôle -->
      <div
        class="flex gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-800"
      >
        <button
          v-for="range in RANGES"
          :key="range.days"
          type="button"
          class="rounded-md px-2.5 py-1 text-xs transition-colors"
          :class="
            selectedDays === range.days
              ? 'bg-violet-600 text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          "
          @click="selectedDays = range.days"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="mt-6 text-sm text-gray-500 dark:text-gray-400">
      Chargement…
    </p>

    <template v-else-if="summary">
      <!-- Stat tiles -->
      <div class="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400">Vues totales</p>
          <p
            class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ summary.totalViews.toLocaleString("fr-FR") }}
          </p>
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Visiteurs uniques (approx.)
          </p>
          <p
            class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ summary.uniqueVisitorsApprox.toLocaleString("fr-FR") }}
          </p>
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Vues (connectés)
          </p>
          <p
            class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ summary.loggedInViews.toLocaleString("fr-FR") }}
          </p>
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Vues (anonymes)
          </p>
          <p
            class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ summary.anonymousViews.toLocaleString("fr-FR") }}
          </p>
        </div>
      </div>
      <p class="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
        Le décompte de visiteurs uniques ne dédoublonne qu'au sein d'une même
        journée (anonymisation par rotation quotidienne) — sur plusieurs jours,
        un même visiteur revenant compte plusieurs fois.
      </p>

      <!-- Tendance -->
      <div
        class="mt-5 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          Évolution
        </h2>
        <TrendLineChart :points="summary.dailySeries" />
      </div>

      <!-- Répartitions -->
      <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Pages les plus consultées
          </h2>
          <BreakdownBarChart
            :rows="
              summary.topPages.map((p) => ({ label: p.path, count: p.views }))
            "
          />
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Monstres les plus consultés
          </h2>
          <ul
            v-if="summary.topItems.length"
            class="flex flex-col gap-1.5 text-xs"
          >
            <li
              v-for="item in summary.topItems"
              :key="item.itemId"
              class="flex items-center justify-between gap-2"
            >
              <RouterLink
                :to="`/monstres/${item.itemId}`"
                class="truncate text-brand-600 hover:underline dark:text-brand-400"
              >
                {{ item.title ?? item.itemId }}
              </RouterLink>
              <span
                class="flex-shrink-0 tabular-nums text-gray-900 dark:text-gray-100"
                >{{ item.views }}</span
              >
            </li>
          </ul>
          <p v-else class="text-xs text-gray-400 dark:text-gray-500">
            Aucune donnée sur cette période.
          </p>
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Système d'exploitation
          </h2>
          <BreakdownBarChart
            :rows="
              summary.byOs.map((r) => ({ label: r.label, count: r.count }))
            "
          />
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Navigateur
          </h2>
          <BreakdownBarChart
            :rows="
              summary.byBrowser.map((r) => ({ label: r.label, count: r.count }))
            "
          />
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Appareil
          </h2>
          <BreakdownBarChart
            :rows="
              summary.byDevice.map((r) => ({
                label: DEVICE_LABELS[r.label] ?? r.label,
                count: r.count,
              }))
            "
          />
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Pays
          </h2>
          <BreakdownBarChart
            :rows="
              summary.byCountry.map((r) => ({ label: r.label, count: r.count }))
            "
            empty-label="Localisation indisponible (base GeoIP non installée) ou aucune donnée."
          />
        </div>
        <div
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Utilisateurs connectés les plus actifs
          </h2>
          <ul
            v-if="summary.topUsers.length"
            class="flex flex-col gap-1.5 text-xs"
          >
            <li
              v-for="u in summary.topUsers"
              :key="u.userId"
              class="flex items-center justify-between gap-2"
            >
              <span
                class="truncate text-gray-700 dark:text-gray-300"
                :title="u.email ?? undefined"
                >{{ u.name ?? u.email ?? "Utilisateur·ice parti·e" }}</span
              >
              <span
                class="flex-shrink-0 tabular-nums text-gray-900 dark:text-gray-100"
                >{{ u.views }}</span
              >
            </li>
          </ul>
          <p v-else class="text-xs text-gray-400 dark:text-gray-500">
            Aucune donnée sur cette période.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
