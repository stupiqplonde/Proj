<script setup lang="ts">
import type { ConversationPreview } from "../types/conversation";
import type { User } from "../types/user";
import ChatListItem from "./ChatListItem.vue";

defineProps<{
  chats: ConversationPreview[];
  archived: ConversationPreview[];
  activeId: number;
  currentUser: User;
  users: User[];
  query: string;
  status: string;
  showArchived: boolean;
  unreadTotal: number;
}>();

const emit = defineEmits<{
  "update:query": [value: string];
  select: [id: number];
  "select-user": [user: User];
  create: [];
  pin: [id: number];
  mute: [id: number];
  archive: [id: number];
  remove: [id: number];
  "toggle-archive": [];
  palette: [];
}>();
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__top">
      <div class="brand">
        <span class="brand-mark">S</span>
        <div>
          <strong>Stupiqplonde</strong>
          <p>{{ status }}</p>
        </div>
        <span v-if="unreadTotal" class="total">{{ unreadTotal }}</span>
      </div>
      <div class="search">
        <input
          :value="query"
          type="search"
          placeholder="Поиск (Ctrl+K)"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
        <button type="button" title="Новый чат" @click="emit('create')">+</button>
      </div>
    </div>

    <nav class="list">
      <ChatListItem
        v-for="chat in chats"
        :key="chat.id"
        :title="chat.title"
        :subtitle="chat.subtitle"
        :last-body="chat.lastBody"
        :last-at="chat.lastAt"
        :unread="chat.unread"
        :active="chat.id === activeId"
        :color="chat.color"
        :muted="Boolean(chat.muted)"
        :pinned="Boolean(chat.pinned)"
        :draft="chat.draft"
        :typing="chat.typing"
        @open="emit('select', chat.id)"
        @pin="emit('pin', chat.id)"
        @mute="emit('mute', chat.id)"
        @archive="emit('archive', chat.id)"
        @remove="emit('remove', chat.id)"
      />
      <p v-if="chats.length === 0" class="empty">Ничего не найдено</p>
    </nav>

    <button class="archive-toggle" type="button" @click="emit('toggle-archive')">
      Архив {{ archived.length ? `(${archived.length})` : "" }}
    </button>

    <nav v-if="showArchived" class="list list--archive">
      <ChatListItem
        v-for="chat in archived"
        :key="chat.id"
        :title="chat.title"
        :subtitle="chat.subtitle"
        :last-body="chat.lastBody"
        :last-at="chat.lastAt"
        :unread="chat.unread"
        :active="chat.id === activeId"
        :color="chat.color"
        :muted="Boolean(chat.muted)"
        :pinned="Boolean(chat.pinned)"
        :draft="chat.draft"
        :typing="chat.typing"
        @open="emit('select', chat.id)"
        @pin="emit('pin', chat.id)"
        @mute="emit('mute', chat.id)"
        @archive="emit('archive', chat.id)"
        @remove="emit('remove', chat.id)"
      />
    </nav>

    <footer class="account">
      <span class="label">Вы пишете как</span>
      <div class="switch">
        <button
          v-for="user in users"
          :key="user.id"
          type="button"
          :class="{ active: user.id === currentUser.id }"
          @click="emit('select-user', user)"
        >
          <span class="dot" :style="{ background: user.color }" />
          {{ user.name }}
        </button>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 340px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--line);
}

.sidebar__top {
  padding: 16px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #3ec6ff, #1c86c8);
  font-weight: 800;
}

.brand p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.total {
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--accent);
  color: #041018;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.search {
  display: flex;
  gap: 8px;
}

.search input {
  flex: 1;
  border: 0;
  border-radius: 22px;
  padding: 10px 14px;
  background: #242f3d;
  color: var(--text);
  outline: none;
}

.search input:focus {
  box-shadow: 0 0 0 2px rgba(42, 171, 238, 0.35);
}

.search button {
  width: 40px;
  border: 0;
  border-radius: 12px;
  background: #242f3d;
  cursor: pointer;
  font-size: 20px;
}

.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.list--archive {
  flex: 0 0 auto;
  max-height: 180px;
  border-top: 1px solid var(--line);
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 24px 12px;
}

.archive-toggle {
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
  padding: 10px 16px;
  text-align: left;
  color: var(--muted);
  cursor: pointer;
}

.archive-toggle:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.account {
  padding: 12px 14px 16px;
  border-top: 1px solid var(--line);
}

.label {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.switch {
  display: flex;
  gap: 6px;
}

.switch button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #242f3d;
  cursor: pointer;
}

.switch button.active {
  border-color: var(--accent);
  background: rgba(42, 171, 238, 0.12);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
