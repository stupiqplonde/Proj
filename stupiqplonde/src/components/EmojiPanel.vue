<script setup lang="ts">
defineProps<{
  emojis?: string[];
}>();

const emit = defineEmits<{
  pick: [emoji: string];
}>();

const defaults = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤔", "😴", "😭", "😡", "👍", "👎", "👏", "🔥",
  "❤️", "💯", "🎉", "✨", "👀", "🙏", "🤝", "🚀",
  "🥶", "🤡", "👻", "⚡", "✅", "📌",
];
</script>

<template>
  <div class="picker">
    <button
      v-for="emoji in emojis ?? defaults"
      :key="emoji"
      type="button"
      @click="emit('pick', emoji)"
    >
      {{ emoji }}
    </button>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #1b2733;
  box-shadow: var(--shadow);
  animation: rise 0.16s ease;
}

button {
  border: 0;
  background: transparent;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

button:hover {
  background: var(--bg-hover);
}
</style>
