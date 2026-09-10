<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import ChatHeader from "./components/ChatHeader.vue";
import ChatInfo from "./components/ChatInfo.vue";
import CommandPalette from "./components/CommandPalette.vue";
import ConfirmModal from "./components/ConfirmModal.vue";
import CreateChatModal from "./components/CreateChatModal.vue";
import ForwardModal from "./components/ForwardModal.vue";
import MessageComposer from "./components/MessageComposer.vue";
import MessageList from "./components/MessageList.vue";
import Sidebar from "./components/Sidebar.vue";
import { MessengerStore } from "./lib/store";
import { formatChatListTime } from "./lib/time";
import type { Conversation, ConversationPreview } from "./types/conversation";
import type { Attachment, Message, MessageView, Reaction } from "./types/messages";
import { USERS, type User } from "./types/user";

const DRAFTS_KEY = "stupiqplonde-drafts-v1";
const PALETTE = ["#6ab2f2", "#e17076", "#7bc862", "#e3a84c", "#b48def", "#57c5b6"];

const store = new MessengerStore();
const users = USERS;
const currentUser = ref<User>(USERS[0]);
const status = ref("Подключение...");
const conversations = ref<Conversation[]>([]);
const messages = ref<Message[]>([]);
const reactions = ref<Reaction[]>([]);
const reads = ref<{ conversation_id: number; user_name: string; last_read_id: number }[]>([]);
const activeId = ref(1);
const chatQuery = ref("");
const inChatOpen = ref(false);
const inChatQuery = ref("");
const searchCursor = ref(0);
const replyTo = ref<Message | null>(null);
const editing = ref<Message | null>(null);
const highlightedId = ref<number | null>(null);
const forwardOf = ref<Message | null>(null);
const createOpen = ref(false);
const paletteOpen = ref(false);
const infoOpen = ref(false);
const showArchived = ref(false);
const firstUnreadId = ref<number | null>(null);
const selectedIds = ref<number[]>([]);
const toast = ref("");
const pendingDeleteChat = ref<Conversation | null>(null);
const pendingDeleteMessage = ref<Message | null>(null);
const drafts = ref<Record<string, Record<number, string>>>(loadDrafts());

function loadDrafts(): Record<string, Record<number, string>> {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "{}") as Record<
      string,
      Record<number, string>
    >;
  } catch {
    return {};
  }
}

function persistDrafts() {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.value));
}

const composerDraft = computed({
  get() {
    return drafts.value[currentUser.value.name]?.[activeId.value] ?? "";
  },
  set(value: string) {
    const byUser = drafts.value[currentUser.value.name] ?? {};
    drafts.value = {
      ...drafts.value,
      [currentUser.value.name]: { ...byUser, [activeId.value]: value },
    };
    persistDrafts();
  },
});

const activeChat = computed(
  () => conversations.value.find((chat) => chat.id === activeId.value) ?? conversations.value[0],
);

const authorColors = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const user of users) map[user.name] = user.color;
  return map;
});

function colorForChat(id: number) {
  return PALETTE[(id - 1) % PALETTE.length];
}

function lastReadFor(chatId: number, userName: string) {
  return (
    reads.value.find(
      (item) => item.conversation_id === chatId && item.user_name === userName,
    )?.last_read_id ?? 0
  );
}

function otherUserName() {
  return users.find((user) => user.name !== currentUser.value.name)?.name ?? "";
}

function toPreview(chat: Conversation): ConversationPreview {
  const chatMessages = messages.value.filter((item) => item.conversation_id === chat.id);
  const last = [...chatMessages].reverse().find((item) => !item.deleted) ?? chatMessages.at(-1);
  const unread = chatMessages.filter(
    (item) =>
      item.id > lastReadFor(chat.id, currentUser.value.name) &&
      item.author !== currentUser.value.name &&
      item.deleted === 0,
  ).length;
  const lastBody = last
    ? last.deleted
      ? "Сообщение удалено"
      : `${last.author}: ${last.body || last.attachment?.name || "вложение"}`
    : chat.subtitle;
  const draft = drafts.value[currentUser.value.name]?.[chat.id]?.trim() ?? "";
  const typing = users.some(
    (user) =>
      user.name !== currentUser.value.name &&
      Boolean(drafts.value[user.name]?.[chat.id]?.trim()),
  );
  return {
    ...chat,
    lastBody,
    lastAt: last ? formatChatListTime(last.created_at) : "",
    lastAuthor: last?.author ?? "",
    unread,
    draft,
    typing,
    color: colorForChat(chat.id),
  };
}

function sortChats(list: ConversationPreview[]) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    const am = messages.value.filter((item) => item.conversation_id === a.id).at(-1)?.id ?? a.id;
    const bm = messages.value.filter((item) => item.conversation_id === b.id).at(-1)?.id ?? b.id;
    return bm - am;
  });
}

function matchesQuery(chat: ConversationPreview) {
  const q = chatQuery.value.trim().toLowerCase();
  if (!q) return true;
  return (
    chat.title.toLowerCase().includes(q) ||
    chat.lastBody.toLowerCase().includes(q) ||
    chat.subtitle.toLowerCase().includes(q)
  );
}

const chatPreviews = computed(() =>
  sortChats(
    conversations.value
      .filter((chat) => !chat.archived)
      .map(toPreview)
      .filter(matchesQuery),
  ),
);

const archivedPreviews = computed(() =>
  sortChats(conversations.value.filter((chat) => chat.archived).map(toPreview).filter(matchesQuery)),
);

const unreadTotal = computed(() =>
  conversations.value
    .map(toPreview)
    .filter((chat) => !chat.archived && !chat.muted)
    .reduce((sum, chat) => sum + chat.unread, 0),
);

function buildViews(list: Message[]): MessageView[] {
  const otherRead = lastReadFor(activeId.value, otherUserName());
  return list.map((message) => {
    const reply =
      message.reply_to_id == null
        ? null
        : (messages.value.find((item) => item.id === message.reply_to_id) ?? null);
    const groups = new Map<string, Reaction[]>();
    for (const reaction of reactions.value.filter((item) => item.message_id === message.id)) {
      const bucket = groups.get(reaction.emoji) ?? [];
      bucket.push(reaction);
      groups.set(reaction.emoji, bucket);
    }
    return {
      ...message,
      reply,
      reactions: [...groups.entries()].map(([emoji, items]) => ({
        emoji,
        count: items.length,
        mine: items.some((item) => item.author === currentUser.value.name),
        authors: items.map((item) => item.author),
      })),
      seen: message.author === currentUser.value.name && message.id <= otherRead,
    };
  });
}

const chatMessages = computed(() =>
  messages.value.filter((item) => item.conversation_id === activeId.value),
);

const searchHits = computed(() => {
  const q = inChatQuery.value.trim().toLowerCase();
  if (!q) return [];
  return chatMessages.value.filter(
    (item) =>
      item.body.toLowerCase().includes(q) || item.author.toLowerCase().includes(q),
  );
});

const visibleMessages = computed(() => buildViews(chatMessages.value));

const pinned = computed(() => {
  const id = activeChat.value?.pinned_message_id;
  if (!id) return null;
  return visibleMessages.value.find((item) => item.id === id) ?? null;
});

const chatMedia = computed<Attachment[]>(() =>
  chatMessages.value
    .map((item) => item.attachment)
    .filter((item): item is Attachment => Boolean(item)),
);

const typingHere = computed(() =>
  users.some(
    (user) =>
      user.name !== currentUser.value.name &&
      Boolean(drafts.value[user.name]?.[activeId.value]?.trim()),
  ),
);

const selectMode = computed(() => selectedIds.value.length > 0);

async function refresh() {
  try {
    conversations.value = await store.listConversations();
    messages.value = await store.listMessages();
    reactions.value = await store.listReactions();
    reads.value = await store.listReads();
  } catch (error) {
    console.error(error);
    status.value = "Ошибка загрузки истории";
  }
  if (!conversations.value.some((chat) => chat.id === activeId.value)) {
    activeId.value = conversations.value[0]?.id ?? 1;
  }
}

async function markCurrentRead() {
  const last = chatMessages.value.at(-1);
  if (!last) return;
  await store.markRead(activeId.value, currentUser.value.name, last.id);
  reads.value = await store.listReads();
}

function captureUnread(id: number) {
  const lastRead = lastReadFor(id, currentUser.value.name);
  firstUnreadId.value =
    messages.value.find(
      (item) =>
        item.conversation_id === id &&
        item.id > lastRead &&
        item.author !== currentUser.value.name &&
        item.deleted === 0,
    )?.id ?? null;
}

async function selectChat(id: number) {
  captureUnread(id);
  activeId.value = id;
  replyTo.value = null;
  editing.value = null;
  inChatQuery.value = "";
  selectedIds.value = [];
  const chat = conversations.value.find((item) => item.id === id);
  if (chat?.archived) showArchived.value = true;
  await markCurrentRead();
}

async function send(payload: { body: string; attachment: Attachment | null }) {
  await store.sendMessage({
    author: currentUser.value.name,
    body: payload.body,
    conversationId: activeId.value,
    replyToId: replyTo.value?.id ?? null,
    attachment: payload.attachment,
  });
  replyTo.value = null;
  composerDraft.value = "";
  await refresh();
  await markCurrentRead();
}

async function saveEdit(body: string) {
  if (!editing.value) return;
  await store.editMessage(editing.value.id, body);
  editing.value = null;
  await refresh();
}

async function remove(message: Message) {
  pendingDeleteMessage.value = message;
}

async function confirmDeleteMessage() {
  if (!pendingDeleteMessage.value) return;
  const id = pendingDeleteMessage.value.id;
  await store.deleteMessage(id);
  pendingDeleteMessage.value = null;
  selectedIds.value = selectedIds.value.filter((item) => item !== id);
  await refresh();
}

async function react(message: Message, emoji: string) {
  await store.toggleReaction(message.id, currentUser.value.name, emoji);
  reactions.value = await store.listReactions();
}

async function pin(message: Message) {
  const already = activeChat.value?.pinned_message_id === message.id;
  await store.pinMessage(activeId.value, already ? null : message.id);
  await refresh();
}

async function unpin() {
  await store.pinMessage(activeId.value, null);
  await refresh();
}

async function forwardTo(conversationId: number) {
  const bundle = selectedIds.value.length
    ? messages.value.filter((item) => selectedIds.value.includes(item.id))
    : forwardOf.value
      ? [forwardOf.value]
      : [];
  for (const item of bundle) {
    if (item.deleted) continue;
    await store.sendMessage({
      author: currentUser.value.name,
      body: item.body,
      conversationId,
      forwardedFrom: item.author,
      attachment: item.attachment,
    });
  }
  forwardOf.value = null;
  selectedIds.value = [];
  activeId.value = conversationId;
  await refresh();
}

async function createChat(title: string) {
  const id = await store.createConversation(title, "Новый чат");
  createOpen.value = false;
  if (id) activeId.value = id;
  await refresh();
}

async function togglePinChat(id: number) {
  const chat = conversations.value.find((item) => item.id === id);
  if (!chat) return;
  await store.patchConversation(id, { pinned: chat.pinned ? 0 : 1 });
  await refresh();
}

async function toggleMuteChat(id: number) {
  const chat = conversations.value.find((item) => item.id === id);
  if (!chat) return;
  await store.patchConversation(id, { muted: chat.muted ? 0 : 1 });
  await refresh();
}

async function toggleArchiveChat(id: number) {
  const chat = conversations.value.find((item) => item.id === id);
  if (!chat) return;
  await store.patchConversation(id, { archived: chat.archived ? 0 : 1 });
  await refresh();
}

async function confirmDeleteChat() {
  if (!pendingDeleteChat.value) return;
  await store.deleteConversation(pendingDeleteChat.value.id);
  pendingDeleteChat.value = null;
  await refresh();
}

function copy(message: Message) {
  if (message.deleted) return;
  void navigator.clipboard.writeText(message.body);
  showToast("Скопировано");
}

function showToast(text: string) {
  toast.value = text;
  window.setTimeout(() => {
    if (toast.value === text) toast.value = "";
  }, 1400);
}

function jumpTo(id: number) {
  highlightedId.value = id;
  window.setTimeout(() => {
    if (highlightedId.value === id) highlightedId.value = null;
  }, 1400);
}

function cycleSearch(dir: 1 | -1) {
  if (!searchHits.value.length) return;
  searchCursor.value =
    (searchCursor.value + dir + searchHits.value.length) % searchHits.value.length;
  jumpTo(searchHits.value[searchCursor.value].id);
}

function toggleSelect(id: number) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id);
  } else {
    selectedIds.value = [...selectedIds.value, id];
  }
}

async function deleteSelected() {
  for (const id of selectedIds.value) await store.deleteMessage(id);
  selectedIds.value = [];
  await refresh();
}

async function jumpPalette(payload: { conversationId: number; messageId?: number }) {
  paletteOpen.value = false;
  await selectChat(payload.conversationId);
  if (payload.messageId) jumpTo(payload.messageId);
}

function onKey(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    paletteOpen.value = true;
  }
  if (event.key === "Escape") {
    paletteOpen.value = false;
    inChatOpen.value = false;
    replyTo.value = null;
    editing.value = null;
    forwardOf.value = null;
    createOpen.value = false;
    infoOpen.value = false;
    selectedIds.value = [];
  }
}

watch(searchHits, () => {
  searchCursor.value = 0;
});

watch(currentUser, async () => {
  captureUnread(activeId.value);
  await markCurrentRead();
});

onMounted(async () => {
  status.value = await store.init();
  await refresh();
  captureUnread(activeId.value);
  await markCurrentRead();
  window.addEventListener("keydown", onKey);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
});
</script>

<template>
  <main class="shell">
    <Sidebar
      :chats="chatPreviews"
      :archived="archivedPreviews"
      :active-id="activeId"
      :current-user="currentUser"
      :users="users"
      :query="chatQuery"
      :status="status"
      :show-archived="showArchived"
      :unread-total="unreadTotal"
      @update:query="chatQuery = $event"
      @select="selectChat"
      @select-user="currentUser = $event"
      @create="createOpen = true"
      @pin="togglePinChat"
      @mute="toggleMuteChat"
      @archive="toggleArchiveChat"
      @remove="pendingDeleteChat = conversations.find((item) => item.id === $event) ?? null"
      @toggle-archive="showArchived = !showArchived"
      @palette="paletteOpen = true"
    />

    <section v-if="activeChat" class="chat">
      <ChatHeader
        :title="activeChat.title"
        :subtitle="activeChat.subtitle || 'в сети'"
        :color="colorForChat(activeChat.id)"
        :search-open="inChatOpen"
        :search-query="inChatQuery"
        :search-count="searchHits.length"
        :typing="typingHere"
        :muted="Boolean(activeChat.muted)"
        @toggle-search="inChatOpen = !inChatOpen"
        @update:search-query="inChatQuery = $event"
        @info="infoOpen = !infoOpen"
        @search-prev="cycleSearch(-1)"
        @search-next="cycleSearch(1)"
      />
      <MessageList
        :messages="inChatQuery.trim() ? buildViews(searchHits) : visibleMessages"
        :current-user-name="currentUser.name"
        :highlighted-id="highlightedId"
        :pinned="pinned"
        :first-unread-id="inChatQuery.trim() ? null : firstUnreadId"
        :selected-ids="selectedIds"
        :select-mode="selectMode"
        :author-colors="authorColors"
        @reply="replyTo = $event; editing = null"
        @edit="editing = $event; replyTo = null"
        @remove="remove"
        @copy="copy"
        @forward="forwardOf = $event"
        @pin="pin"
        @react="(message, emoji) => react(message, emoji)"
        @open-reply="jumpTo"
        @unpin="unpin"
        @toggle-select="toggleSelect"
      />
      <div v-if="selectMode" class="select-bar">
        <span>Выбрано: {{ selectedIds.length }}</span>
        <button type="button" @click="forwardOf = messages.find((item) => item.id === selectedIds[0]) ?? null">
          Переслать
        </button>
        <button type="button" @click="deleteSelected">Удалить</button>
        <button type="button" @click="selectedIds = []">Отмена</button>
      </div>
      <MessageComposer
        v-model="composerDraft"
        :reply-to="replyTo"
        :editing="editing"
        @send="send"
        @save="saveEdit"
        @cancel="replyTo = null; editing = null"
      />
    </section>

    <ChatInfo
      :open="infoOpen"
      :chat="activeChat ?? null"
      :color="activeChat ? colorForChat(activeChat.id) : PALETTE[0]"
      :users="users"
      :media="chatMedia"
      @close="infoOpen = false"
      @mute="activeChat && toggleMuteChat(activeChat.id)"
      @pin="activeChat && togglePinChat(activeChat.id)"
      @archive="activeChat && toggleArchiveChat(activeChat.id)"
    />

    <ForwardModal
      :open="Boolean(forwardOf)"
      :chats="[...chatPreviews, ...archivedPreviews]"
      :message="forwardOf"
      @close="forwardOf = null"
      @pick="forwardTo"
    />
    <CreateChatModal :open="createOpen" @close="createOpen = false" @create="createChat" />
    <CommandPalette
      :open="paletteOpen"
      :chats="[...chatPreviews, ...archivedPreviews]"
      :messages="messages"
      @close="paletteOpen = false"
      @jump="jumpPalette"
    />
    <ConfirmModal
      :open="Boolean(pendingDeleteChat)"
      title="Удалить чат?"
      body="История этого чата будет удалена на этом устройстве."
      @close="pendingDeleteChat = null"
      @confirm="confirmDeleteChat"
    />
    <ConfirmModal
      :open="Boolean(pendingDeleteMessage)"
      title="Удалить сообщение?"
      body="Сообщение будет удалено для локальной истории."
      @close="pendingDeleteMessage = null"
      @confirm="confirmDeleteMessage"
    />
    <div v-if="toast" class="toast">{{ toast }}</div>
  </main>
</template>

<style scoped>
.shell {
  height: 100%;
  display: flex;
  overflow: hidden;
}

.chat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-chat);
}

.select-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #17212b;
  border-top: 1px solid var(--line);
}

.select-bar button {
  border: 0;
  border-radius: 10px;
  padding: 6px 10px;
  background: #242f3d;
  cursor: pointer;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  padding: 8px 14px;
  border-radius: 12px;
  background: #1b2733;
  box-shadow: var(--shadow);
  z-index: 40;
  animation: rise 0.16s ease;
}
</style>
