<script setup lang="ts">
import { computed } from "vue";
import { initials } from "../lib/text";
import type { Conversation } from "../types/conversation";
import type { Attachment } from "../types/messages";
import type { User } from "../types/user";

const props = defineProps<{
  open: boolean;
  chat: Conversation | null;
  color: string;
  users: User[];
  media: Attachment[];
}>();

const emit = defineEmits<{
  close: [];
  mute: [];
  pin: [];
  archive: [];
}>();

const photos = computed(() => props.media.filter((item) => item.kind === "image").slice(-12).reverse());
</script>

<template>
  <aside v-if="open && chat" class="info">
    <header>
      <span class="avatar" :style="{ background: color, width: '72px', height: '72px', fontSize: '24px' }">
        {{ initials(chat.title) }}
      </span>
      <h3>{{ chat.title }}</h3>
      <p>{{ chat.subtitle }}</p>
      <button class="close" type="button" @click="emit('close')">✕</button>
    </header>
    <div class="actions">
      <button type="button" @click="emit('mute')">{{ chat.muted ? "Включить звук" : "Без звука" }}</button>
      <button type="button" @click="emit('pin')">{{ chat.pinned ? "Открепить" : "Закрепить" }}</button>
      <button type="button" @click="emit('archive')">
        {{ chat.archived ? "Разархивировать" : "В архив" }}
      </button>
    </div>
    <section>
      <h4>Участники</h4>
      <p v-for="user in users" :key="user.id">{{ user.name }} · {{ user.handle }}</p>
    </section>
    <section v-if="photos.length">
      <h4>Медиа</h4>
      <div class="grid">
        <img v-for="item in photos" :key="item.name + item.data.slice(0, 24)" :src="item.data" :alt="item.name" />
      </div>
    </section>
  </aside>
</template>

<style scoped>
.info {
  width: 280px;
  border-left: 1px solid var(--line);
  background: var(--bg-sidebar);
  padding: 18px 16px;
  animation: rise 0.18s ease;
  overflow-y: auto;
}

header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  margin-bottom: 16px;
}

.close {
  position: absolute;
  right: 0;
  top: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

h3,
h4,
p {
  margin: 0;
}

h4 {
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
}

section {
  margin-top: 16px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.actions button {
  border: 0;
  border-radius: 10px;
  padding: 8px 10px;
  background: #242f3d;
  cursor: pointer;
  text-align: left;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.grid img {
  width: 100%;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}
</style>
