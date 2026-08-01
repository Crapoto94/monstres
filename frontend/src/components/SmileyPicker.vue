<script setup lang="ts">
const emit = defineEmits<{ (e: 'select', emoji: string): void }>()

const SMILEYS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘',
  '😎', '🤗', '🤔', '🙂', '😉', '😇', '🥳', '🤩',
  '😋', '😜', '🤪', '😅', '😢', '😭', '😴', '🤤',
  '😳', '🤯', '😤', '😡', '🤬', '😷', '🤒', '🤕',
  '👍', '👎', '👏', '🙏', '💪', '🤝', '👌', '✌️',
  '❤️', '💔', '💙', '💚', '💛', '🧡', '💜', '💯',
  '✨', '🔥', '⭐', '🌹', '😺', '🐶', '🦊', '🐻',
  '🎉', '🎊', '🎂', '🚀', '✅', '❌', '⚠️', '💡',
]
</script>

<template>
  <div class="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
    <button
      v-for="smiley in SMILEYS"
      :key="smiley"
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      @click="emit('select', smiley)"
    >
      {{ smiley }}
    </button>
  </div>
</template>
