<script setup lang="ts">
import type { User } from "./types/user.ts";
import type { Message } from "./types/messages.ts";
import type { Reaction } from "./types/reactions.ts";

import Database from "@tauri-apps/plugin-sql";

import MessageList from "./components/MessageList.vue";
import MessageComposer from "./components/MessageComposer.vue";
import EmojiPanel from "./components/EmojiPanel.vue";
import AppHeader from "./components/AppHeader.vue";

import { computed, onMounted, onUnmounted, ref } from "vue";

type EmojiTarget =
  | { kind: "composer" }
  | { kind: "reaction"; messageId: number };

const AVATARS_KEY = "avatars";

const users = ref<User[]>([
  { id: 1, name: "Oleg", avatar: "" },
  { id: 2, name: "Kirill", avatar: "" },
]);

const currentUser = ref<User>(users.value[0]);

function loadAvatars() {
  try {
    const saved = JSON.parse(localStorage.getItem(AVATARS_KEY) ?? "{}") as Record<
      string,
      string
    >;

    for (const user of users.value) {
      const avatar = saved[user.id];
      if (typeof avatar === "string") user.avatar = avatar;
    }
  } catch {
    return;
  }
}

function selectUser(user: User) {
  currentUser.value = user;
}

function setAvatar(user: User, path: string) {
  user.avatar = path;

  const saved: Record<number, string> = {};
  for (const item of users.value) {
    saved[item.id] = item.avatar;
  }
  localStorage.setItem(AVATARS_KEY, JSON.stringify(saved));
}

const messages = ref<Message[]>([]);
const reactions = ref<Reaction[]>([]);
const status = ref("Подключение...");
const emojiTarget = ref<EmojiTarget | null>(null);
const composerInsertEmoji = ref<string | null>(null);

let db: Database | null = null;

const emojiPanelTitle = computed(() => {
  if (emojiTarget.value?.kind === "reaction") {
    return "Реакция на сообщение";
  }

  return "Вставить в сообщение";
});

async function loadMessages(/*chat_id: number*/) {
  if (!db) return;

  messages.value = await db.select<Message[]>(
    "SELECT id, author, type, body, attachment, created_at FROM messages ORDER BY id ASC",
      /*[chat_id]*/
  );
}

async function loadReactions() {
  if (!db) return;

  reactions.value = await db.select<Reaction[]>(
    "SELECT id, message_id, emoji, author FROM message_reactions ORDER BY id ASC",
  );
}

async function loadChat() {
  await Promise.all([loadMessages(), loadReactions()]);
}

async function sendMessage(body: string) {
  if (!db) return;

  await db.execute("INSERT INTO messages (author, body) VALUES ($1, $2)", [
    currentUser.value.name,
    body,
  ]);
  await loadChat();
}

async function toggleReaction(messageId: number, emoji: string) {
  if (!db) return;

  const existing = reactions.value.find(
    (reaction) =>
      reaction.message_id === messageId &&
      reaction.emoji === emoji &&
      reaction.author === currentUser.value.name,
  );

  if (existing) {
    await db.execute("DELETE FROM message_reactions WHERE id = $1", [
      existing.id,
    ]);
  } else {
    try {
      await db.execute(
        "INSERT INTO message_reactions (message_id, emoji, author) VALUES ($1, $2, $3)",
        [messageId, emoji, currentUser.value.name],
      );
    } catch (error) {
      console.error(error);
    }
  }

  await loadReactions();
}

function closeEmojiPanel() {
  emojiTarget.value = null;
}

function openComposerEmoji() {
  if (emojiTarget.value?.kind === "composer") {
    closeEmojiPanel();
    return;
  }

  emojiTarget.value = { kind: "composer" };
}

function openReactionEmoji(messageId: number) {
  if (
    emojiTarget.value?.kind === "reaction" &&
    emojiTarget.value.messageId === messageId
  ) {
    closeEmojiPanel();
    return;
  }

  emojiTarget.value = { kind: "reaction", messageId };
}

function onEmojiSelect(emoji: string) {
  const target = emojiTarget.value;
  if (!target) return;

  if (target.kind === "composer") {
    composerInsertEmoji.value = emoji;
    return;
  }

  closeEmojiPanel();
  void toggleReaction(target.messageId, emoji);
}

function onEmojiInserted() {
  composerInsertEmoji.value = null;
}

// async function sendImage(path: string){
//   if(!db)
//     return;
//   if (!activeChat.value)
//     return;
//
//   await db.execute(
//       `
//       INSERT INTO messages
//           (
//            chat_id,
//            author,
//            type,
//            body,
//            attachment
//           )
//
//         VALUES
//             (
//              $1,
//              $2,
//              $3,
//              $4,
//              $5
//             )
//       `,
//       [
//           activeChat.value.id,
//           currentUser.value.name,
//           "image",
//           null,
//           path
//       ]
//   );
//
//   await loadMessages(
//       activeChat.value.id
//   )
// }

function onDocumentPointerDown(event: PointerEvent) {
  if (!emojiTarget.value) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  if (
    target.closest(".emoji-panel, .composer, .quick-reactions, .reaction")
  ) {
    return;
  }

  closeEmojiPanel();
}

onMounted(async () => {
  loadAvatars();
  window.addEventListener("pointerdown", onDocumentPointerDown);

  try {
    db = await Database.load("sqlite:messanger.db");
    await db.execute("PRAGMA foreign_keys = ON");
    await loadChat();
    status.value = "История сохраняется локально";
  } catch (error) {
    console.error(error);
    status.value = "Ошибка подключения к базе";
  }
});

onUnmounted(() => {
  window.removeEventListener("pointerdown", onDocumentPointerDown);
});
</script>

<template>
  <main class="app">
    <AppHeader
      :status="status"
      :users="users"
      :current-user="currentUser"
      @select="selectUser"
      @set-avatar="setAvatar"
    />
    <section class="chat">
      <div class="chat-info">
        <h2>Первый чат</h2>
        <p>локальный мессенджер</p>
      </div>
      <MessageList
        :messages="messages"
        :reactions="reactions"
        :users="users"
        :current-user-name="currentUser.name"
        :reaction-message-id="
          emojiTarget?.kind === 'reaction' ? emojiTarget.messageId : null
        "
        @toggle-reaction="toggleReaction"
        @request-reaction="openReactionEmoji"
      />
      <EmojiPanel
        v-if="emojiTarget"
        :title="emojiPanelTitle"
        @select="onEmojiSelect"
        @close="closeEmojiPanel"
      />
      <MessageComposer
        :insert-emoji="composerInsertEmoji"
        :emoji-open="emojiTarget?.kind === 'composer'"
        @send="sendMessage"
        @request-emoji="openComposerEmoji"
        @emoji-inserted="onEmojiInserted"
      />
    </section>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html) {
  background: #111318;
  color-scheme: dark;
}

:global(body) {
  margin: 0;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  color: #f2f3f5;

  background: #111318;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-info {
  padding: 20px 24px;
  border-bottom: 1px solid #8f96a3;
}

.chat-info h2 {
  margin: 0;
  font-size: 16px;
}

.chat-info p {
  margin: 5px 0 0;
  color: #8f96a3;
  font-size: 13px;
}
</style>
