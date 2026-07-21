<script setup lang="ts">
import BottomNav from '@/components/layout/BottomNav.vue'
</script>

<template>
  <div class="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-white dark:bg-gray-950">
    <RouterView />
    <BottomNav />
  </div>
</template>
