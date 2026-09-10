<script setup lang="ts">
import { ref } from "vue";
import { initials } from "../lib/text";

defineProps<{
  title: string;
  subtitle: string;
  lastBody: string;
  lastAt: string;
  unread: number;
  active: boolean;
  color: string;
  muted: boolean;
  pinned: boolean;
  draft: string;
  typing: boolean;
}>();

const emit = defineEmits<{
  open: [];
  pin: [];
  mute: [];
  archive: [];
  remove: [];
}>();

const menuOpen = ref(false);
</script>

<template>
  <div class="wrap" :class="{ 'wrap--active': active }">
    <button
      class="item"
      type="button"
      @click="emit('open')"
      @contextmenu.prevent="menuOpen = !menuOpen"
    >
      <span class="avatar" :style="{ background: color, width: '48px', height: '48px' }">
        {{ initials(title) }}
      </span>
      <span class="meta">
        <span class="row">
          <strong>
            <span v-if="pinned" class="pin" title="Закреплён">📌</span>
            {{ title }}
          </strong>
          <time>{{ lastAt }}</time>
        </span>
        <span class="row">
          <span v-if="typing" class="preview typing">печатает...</span>
          <span v-else-if="draft && !active" class="preview draft">Черновик: {{ draft }}</span>
          <span v-else class="preview">{{ lastBody || subtitle }}</span>
          <span v-if="unread && !muted" class="unread">{{ unread }}</span>
          <span v-else-if="unread && muted" class="unread unread--muted">{{ unread }}</span>
        </span>
      </span>
    </button>

    <div v-if="menuOpen" class="menu" @mouseleave="menuOpen = false">
      <button type="button" @click="emit('pin'); menuOpen = false">
        {{ pinned ? "Открепить" : "Закрепить чат" }}
      </button>
      <button type="button" @click="emit('mute'); menuOpen = false">
        {{ muted ? "Включить звук" : "Без звука" }}
      </button>
      <button type="button" @click="emit('archive'); menuOpen = false">Архивировать</button>
      <button class="danger" type="button" @click="emit('remove'); menuOpen = false">Удалить чат</button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}

.item {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.item:hover,
.wrap--active .item {
  background: var(--bg-hover);
}

.wrap--active .item {
  background: #2b5278;
}

.wrap--active .preview,
.wrap--active time {
  color: rgba(255, 255, 255, 0.72);
}

.meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin {
  font-size: 11px;
}

time,
.preview {
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview {
  flex: 1;
}

.draft {
  color: #6ab2f2;
}

.typing {
  color: var(--accent);
  font-style: italic;
}

.unread {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--accent);
  color: #041018;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.unread--muted {
  background: #6b7c8d;
  color: white;
}

.menu {
  position: absolute;
  right: 10px;
  top: 48px;
  z-index: 8;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: 6px;
  border-radius: 12px;
  background: #1b2733;
  box-shadow: var(--shadow);
  animation: rise 0.14s ease;
}

.menu button {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.menu button:hover {
  background: var(--bg-hover);
}

.danger {
  color: var(--danger);
}
</style>
