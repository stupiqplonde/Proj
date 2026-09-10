<script setup lang="ts">
import { initials } from "../lib/text";

defineProps<{
  title: string;
  subtitle: string;
  color: string;
  searchOpen: boolean;
  searchQuery: string;
  searchCount: number;
  typing: boolean;
  muted: boolean;
}>();

const emit = defineEmits<{
  "toggle-search": [];
  "update:searchQuery": [value: string];
  info: [];
  search-prev: [];
  search-next: [];
}>();
</script>

<template>
  <header class="header">
    <button class="who" type="button" @click="emit('info')">
      <span class="avatar" :style="{ background: color, width: '42px', height: '42px' }">
        {{ initials(title) }}
      </span>
      <div>
        <h2>
          {{ title }}
          <span v-if="muted" title="Без звука">🔕</span>
        </h2>
        <p>
          <span class="online" />
          <span v-if="typing" class="typing">печатает...</span>
          <span v-else>{{ subtitle }}</span>
        </p>
      </div>
    </button>
    <div class="actions">
      <div v-if="searchOpen" class="inchat-wrap">
        <input
          class="inchat"
          :value="searchQuery"
          type="search"
          placeholder="Поиск в чате"
          autofocus
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
        <span v-if="searchQuery" class="count">{{ searchCount }}</span>
        <button type="button" @click="emit('search-prev')">↑</button>
        <button type="button" @click="emit('search-next')">↓</button>
      </div>
      <button type="button" @click="emit('toggle-search')">Поиск</button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 18px;
  background: rgba(23, 33, 43, 0.92);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(16px);
}

.who {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 0;
}

h2 {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.typing {
  color: var(--accent);
  font-style: italic;
}

.online {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.12);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inchat-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  animation: rise 0.18s ease;
}

.inchat {
  width: min(220px, 36vw);
  border: 0;
  border-radius: 18px;
  padding: 8px 12px;
  background: #242f3d;
  color: var(--text);
  outline: none;
}

.count {
  color: var(--muted);
  font-size: 12px;
  min-width: 18px;
}

.actions button {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  background: #242f3d;
  cursor: pointer;
}
</style>
