<script setup lang="ts">
import { computed, ref } from "vue";
import type { Chat } from "../types/chats";
import type { User } from "../types/user";
import AppIcon from "./AppIcon.vue";
import UserAvatar from "./UserAvatar.vue";

const props = defineProps<{
  chats: Chat[];
  activeChatId: number;
  busy: boolean;
  currentUser: User | null;
  filter: string;
}>();
const emit = defineEmits<{
  select: [chat: Chat];
  create: [];
  createChannel: [];
  joinChannel: [];
  account: [];
}>();
const search = ref("");
const isCreateMenuOpen = ref(false);
const filteredChats = computed(() => props.chats.filter(chat =>
  chat.title.toLowerCase().includes(search.value.trim().toLowerCase()) && (
    props.filter === "all" || chat.kind === props.filter
  ),
));
const sections = computed(() => [
  { title: "СООБЩЕНИЯ", kind: "chat", chats: filteredChats.value.filter(chat => chat.kind === "chat") },
  { title: "КАНАЛЫ", kind: "channel", chats: filteredChats.value.filter(chat => chat.kind === "channel") },
].filter(section => props.filter === "all" || props.filter === section.kind));

function create(kind: string){
  isCreateMenuOpen.value = false;
  if (kind === "chat") emit("create");
  else if (kind === "channel") emit("createChannel");
  else emit("joinChannel");
}
</script>

<template>
  <aside class="sidebar">
    <header class="sidebar-header"><strong>Encore<span>67</span></strong><span class="workspace-label">ЛИЧНОЕ</span></header>
    <div class="sidebar-search"><AppIcon name="search" :size="15" /><input v-model="search" aria-label="Поиск чатов" placeholder="Найти разговор" :disabled="!currentUser" /><kbd>⌕</kbd></div>
    <div class="sidebar-heading">
      <span>{{ filter === 'channel' ? 'Каналы' : filter === 'chat' ? 'Сообщения' : 'Все разговоры' }}</span>
      <button type="button" class="icon-button" aria-label="Создать чат или канал" :disabled="busy || !currentUser" :aria-expanded="isCreateMenuOpen" @click="isCreateMenuOpen = !isCreateMenuOpen"><AppIcon name="plus" :size="17" /></button>
      <div v-if="isCreateMenuOpen" class="create-menu" @keydown.esc="isCreateMenuOpen = false">
        <button type="button" :disabled="busy" @click="create('chat')"><AppIcon name="chat" :size="16" />Новый чат</button>
        <button type="button" :disabled="busy" @click="create('channel')"><AppIcon name="hash" :size="16" />Новый канал</button>
        <button type="button" :disabled="busy" @click="create('join')"><AppIcon name="plus" :size="16" />Вступить по коду</button>
      </div>
    </div>
    <div class="sidebar-list">
      <section v-for="section in sections" :key="section.kind" class="sidebar-section">
        <h2>{{ section.title }}<span>{{ section.chats.length }}</span></h2>
        <button v-for="chat in section.chats" :key="chat.id" type="button" class="chat-button"
          :class="{ 'chat-button--active': chat.id === activeChatId }" :disabled="busy" @click="emit('select', chat)">
          <span class="chat-icon" :class="{ 'chat-icon--channel': chat.kind === 'channel' }"><AppIcon :name="chat.kind === 'channel' ? 'hash' : 'chat'" :size="18" /></span>
          <span class="chat-details"><strong>{{ chat.title }}</strong><small>{{ chat.subtitle || (chat.kind === 'channel' ? 'Публикации и обсуждения' : 'Начните разговор') }}</small></span>
          <span v-if="chat.unread_count > 0" class="unread-badge">{{ chat.unread_count }}</span>
        </button>
        <p v-if="!section.chats.length" class="sidebar-empty">{{ search ? 'Ничего не найдено' : section.kind === 'channel' ? 'Пока нет каналов' : 'Пока нет разговоров' }}</p>
      </section>
    </div>
    <button type="button" class="sidebar-account" :disabled="busy || !currentUser" @click="emit('account')">
      <template v-if="currentUser"><UserAvatar :user="currentUser" :size="35" /><span><strong>{{ currentUser.display_name }}</strong><small><i></i>На связи</small></span></template>
      <template v-else><span class="account-placeholder"><AppIcon name="user" :size="18" /></span><span><strong>Ваш аккаунт</strong><small>Войдите, чтобы начать</small></span></template>
      <AppIcon name="settings" :size="18" />
    </button>
  </aside>
</template>

<style scoped>
.sidebar { width: 250px; flex-shrink: 0; display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--border); background: var(--sidebar); }
.sidebar-header { height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 19px; border-bottom: 1px solid var(--border); }.sidebar-header strong { font-size: 18px; letter-spacing: -.7px; font-weight: 650; }.sidebar-header strong span { color: var(--muted); margin-left: 4px; font-size: 11px; font-weight: 450; }.workspace-label { font-size: 8px; font-weight: 600; color: var(--muted); letter-spacing: .1em; border: 1px solid var(--border); padding: 4px 5px; border-radius: 4px; }
.sidebar-search { display: flex; align-items: center; gap: 7px; margin: 18px 14px 14px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); background: var(--surface); }.sidebar-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: none; color: var(--text); font-size: 11px; }.sidebar-search:focus-within { border-color: var(--accent); }.sidebar-search kbd { font-size: 13px; }
.sidebar-heading { position: relative; display: flex; align-items: center; justify-content: space-between; margin: 0 14px 10px; padding: 0 3px; font-size: 11px; font-weight: 600; }
.create-menu { position: absolute; top: 30px; right: 0; z-index: 20; width: 194px; border: 1px solid var(--border); padding: 5px; border-radius: 12px; background: white; box-shadow: 0 8px 30px #17234514; }.create-menu button { width: 100%; display: flex; gap: 9px; align-items: center; border: 0; padding: 11px 8px; border-radius: 7px; background: none; text-align: left; font-size: 11px; color: var(--text); }.create-menu button:hover { background: var(--accent-soft); }
.sidebar-list { flex: 1; overflow-y: auto; padding: 0 10px; }.sidebar-section { margin-bottom: 23px; }.sidebar-section h2 { display: flex; align-items: center; justify-content: space-between; font-size: 9px; font-weight: 600; letter-spacing: .07em; color: var(--muted); margin: 13px 9px 9px; }.sidebar-section h2 span { font-weight: 400; }
.chat-button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 9px; border: 0; border-radius: 9px; background: none; color: var(--text); text-align: left; margin-bottom: 3px; }.chat-button:hover { background: #ebeef3; }.chat-button--active { background: var(--accent-soft); }.chat-button--active .chat-details strong { color: var(--accent); }
.chat-icon { width: 33px; height: 33px; display: grid; place-items: center; flex-shrink: 0; background: #e9ecf3; border-radius: 10px; color: #8793aa; }.chat-icon--channel { background: #eaf0eb; color: #74937c; }.chat-button--active .chat-icon { background: white; color: var(--accent); }.chat-details { min-width: 0; flex: 1; }.chat-details strong, .chat-details small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.chat-details strong { font-size: 12px; font-weight: 550; }.chat-details small { color: var(--muted); font-size: 10px; margin-top: 5px; }.unread-badge { min-width: 17px; padding: 2px 5px; border-radius: 6px; background: var(--accent); color: white; font-size: 9px; text-align: center; }
.sidebar-empty { margin: 14px 9px; font-size: 11px; color: var(--muted); }.sidebar-account { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 14px 16px; width: 100%; border: 0; border-top: 1px solid var(--border); background: #edf0f5; color: var(--text); text-align: left; }.sidebar-account > span:not(.user-avatar):not(.account-placeholder) { flex: 1; min-width: 0; }.sidebar-account strong, .sidebar-account small { display: block; }.sidebar-account strong { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.sidebar-account small { display: flex; align-items: center; gap: 5px; margin-top: 5px; font-size: 9px; color: var(--muted); }.sidebar-account i { width: 5px; height: 5px; border-radius: 50%; background: #34c759; }.sidebar-account > svg { color: var(--muted); }.account-placeholder { width: 35px; height: 35px; border-radius: 50%; display: grid; place-items: center; background: var(--border); color: var(--muted); }
@media (max-width: 720px) { .sidebar { width: 205px; }.sidebar-header { padding: 0 14px; }.workspace-label { display: none; } }
</style>
