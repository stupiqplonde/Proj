<script setup lang="ts">

import type { User } from "./types/user";

// Импорт 2 функций из vue
// onMounted - запускает код после появления компонента
// ref -  создает быстрые перемещения
import { onMounted, ref } from "vue";

import Database from "@tauri-apps/plugin-sql";

import AppHeader from "./components/AppHeader.vue";

import MessageList from "./components/MessageList.vue";

import MessageComposer from "./components/MessageComposer.vue";

import ChatSidebar from "./components/ChatSidebar.vue";

import type { Chat } from "./types/chats";

import type { Message, MessageDelete, MessageEdit } from "./types/message.ts";

import type {ProfileUpdate} from "./types/user";

import ProfileEditor from "./components/ProfileEditor.vue";
import ForwardMessageDialog from "./components/ForwardMessageDialog.vue";
import { forwardMessage as persistForwardMessage } from "./services/forwardMessage";

const isProfileOpen = ref(false);

function openProfile(){
  isProfileOpen.value = true;
}

function closeProfile(){
  isProfileOpen.value = false;
}


async function saveProfile( profile: ProfileUpdate, ){
  if (!db) return;
  if (!currentUser.value) return;

  await db.execute(
      `
        UPDATE users

        SET
            display_name = $1,
            status = $2

        WHERE id = $3
      `,
      [
          profile.displayName,
          profile.status,
          currentUser.value.id,
      ],
  );

  currentUser.value.display_name = profile.displayName;
  currentUser.value.status = profile.status;

  if(activeChat.value){
    await loadMessages(
        activeChat.value.id,
    );
  }

  closeProfile();
}

const users = ref<User[]>([]);

const currentUser = ref<User | null>(null);

async function selectUser(user: User){
  currentUser.value = user;

  if (activeChat.value){
    await selectChat(activeChat.value);
    return;
  }

  await loadChats();
}

// Создаем структуру одного сообщения

// Список сообщений, которые vue отображет в диалоге на экране
const messages = ref<Message[]>([]);

const chats = ref<Chat[]>([]);

const activeChat = ref<Chat | null>(null);

const activeChatId = ref(1);

const editingMessage = ref<Message | null>(null);

const deletingMessage = ref<Message | null>(null);
const forwardingMessage = ref<Message | null>(null);
const isForwarding = ref(false);
const forwardingError = ref("");
const forwardNotice = ref("");

// Статус подключения к бд
const status = ref("Подключение...")

// Здесь будет подключение к бд (честно), но пока тут null
let db: Database | null = null;

async function loadChats(){
  if (!db) return;
  if (!currentUser.value) return;

  chats.value = await db.select<Chat[]>(
    `
      SELECT
        chats.id,
        chats.title,
        chats.subtitle,
        COUNT(messages.id) AS unread_count
      FROM chats
      LEFT JOIN chat_reads
        ON chat_reads.chat_id = chats.id
       AND chat_reads.user_id = $1
      LEFT JOIN messages
        ON messages.chat_id = chats.id
       AND messages.id > COALESCE(chat_reads.last_read_message_id, 0)
       AND messages.author_id != $2
      GROUP BY chats.id
      ORDER BY chats.id ASC
    `,
    [
      currentUser.value.id,
      currentUser.value.id,
    ],
  );
}

async function markChatRead(chatId: number){
  if (!db) return;
  if (!currentUser.value) return;

  const lastReadMessageId = messages.value.at(-1)?.id ?? 0;

  await db.execute(
    `
      INSERT INTO chat_reads (
        user_id,
        chat_id,
        last_read_message_id
      )
      VALUES ($1, $2, $3)
      ON CONFLICT(user_id, chat_id)
      DO UPDATE SET
        last_read_message_id = excluded.last_read_message_id
    `,
    [
      currentUser.value.id,
      chatId,
      lastReadMessageId,
    ],
  );
}

async function selectChat(chat: Chat){
  activeChat.value = chat;

  activeChatId.value = chat.id;

  editingMessage.value = null;
  deletingMessage.value = null;

  await loadMessages(chat.id);
  await markChatRead(chat.id);
  await loadChats();
}

// Асинхронная функция загрузки сообщений из sql
async function loadMessages(chatId: number){
  // Если база еще не подключена, прерываем выполнение
  if (!db) return;

  // Читаем данные из таблицы messages
  messages.value = await db.select<Message[]>(
    `SELECT
       messages.id,
       messages.chat_id,
       messages.author_id,
       users.display_name AS author_name,
       users.avatar_path AS author_avatar,
       messages.type,
       messages.body,
       messages.attachment,
       messages.created_at,
       messages.edited_at,
       messages.forwarded_author_name,
       messages.forwarded_created_at
      FROM messages
      INNER JOIN users
            ON users.id = messages.author_id
      WHERE messages.chat_id = $1
      ORDER BY messages.id ASC`,
      [chatId],
  );
}

async function loadUsers(){
  if(!db) return;

  users.value =
      await  db.select<User[]>(
          `
          SELECT
            id,
            username,
            display_name,
            avatar_path,
            status,
            created_at
          FROM users
          ORDER BY id ASC
         `,
      );
  if (users.value.length > 0 && currentUser.value === null){
    currentUser.value = users.value[0];
  }
}

// Функция отправки нового сообщения
async function sendMessage(body: string){
  if (!db) return;

  if (!activeChat.value) return;

  if (!currentUser.value) return;

  await db.execute(
    `
       INSERT INTO messages (
            chat_id,
            author_id,
            type,
            body,
            attachment
       )
       VALUES ($1, $2, $3, $4, $5)
    `,
      [
          activeChat.value.id,
          currentUser.value.id,
          "text",
          body,
          null,
      ],
  );
  await loadMessages(activeChat.value.id);
  await markChatRead(activeChat.value.id);
  await loadChats();
}

function onDelete(message: Message){
  editingMessage.value = null;
  deletingMessage.value = message;
}

function cancelDelete(){
  deletingMessage.value = null;
}

async function deleteMessage(dellmess: MessageDelete){
  if (!db) return;

  if (!activeChat.value) return;

  if (!currentUser.value) return;

  await db.execute(
      `
        DELETE FROM messages
        WHERE id = $1
      `,
      [dellmess.id],
  );

  deletingMessage.value = null;

  await loadMessages(activeChat.value.id);
  await markChatRead(activeChat.value.id);
  await loadChats();
}

async function sendImage(path:string){
  if(!db)
    return;

  if (!activeChat.value)
    return;

  if (!currentUser.value) return;

  await db.execute(
      `
        INSERT INTO messages
        (
           chat_id,
           author_id,
           type,
           body,
           attachment
        )

        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5
        )
      `,
      [
          activeChat.value.id,
          currentUser.value.id,
          "image",
          null,
          path,
      ]
  );

  await loadMessages(activeChat.value.id);
  await markChatRead(activeChat.value.id);
  await loadChats();
}

function onEdit(message: Message){
  deletingMessage.value = null;
  editingMessage.value = message;
}

function cancelEdit(){
  editingMessage.value = null;
}

async function editMessage(edit: MessageEdit){
  if (!db) return;

  if (!activeChat.value) return;

  await db.execute(
      `
        UPDATE messages
        SET
          body = $1,
          edited_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
          edit.body,
          edit.id,
      ],
  );

  editingMessage.value = null;

  await loadMessages(activeChat.value.id);
}

async function onCopy(message: Message){
  const text = message.body ?? "";

  if (!text) return;

  await navigator.clipboard.writeText(text);
}

function onForward(message: Message){
  forwardingError.value = "";
  forwardNotice.value = "";
  forwardingMessage.value = message;
}

function cancelForward(){
  if (isForwarding.value) return;
  forwardingMessage.value = null;
  forwardingError.value = "";
}

async function confirmForward(chatId: number){
  if (isForwarding.value) return;
  if (!db || !currentUser.value || !forwardingMessage.value) return;

  const database = db;
  const messageId = forwardingMessage.value.id;
  const senderId = currentUser.value.id;
  const destinationTitle = chats.value.find(chat => chat.id === chatId)?.title ?? "выбранный чат";
  isForwarding.value = true;
  forwardingError.value = "";

  try {
    await persistForwardMessage(database, messageId, chatId, senderId);
  } catch (error) {
    console.error(error);
    forwardingError.value = "Не удалось переслать сообщение. Проверьте, что сообщение и чат ещё существуют, и повторите попытку.";
    isForwarding.value = false;
    return;
  }

  // Once committed, close the dialog before refreshing. A refresh failure
  // must not offer to reinsert a message that has already been sent.
  forwardingMessage.value = null;
  forwardNotice.value = `Сообщение переслано в «${destinationTitle}».`;
  try {
    if (currentUser.value?.id === senderId && activeChat.value?.id === chatId) {
      await loadMessages(chatId);
      await markChatRead(chatId);
    }
    await loadChats();
  } catch (error) {
    console.error(error);
    forwardNotice.value += " Не удалось обновить список. Откройте чат заново.";
  } finally {
    isForwarding.value = false;
  }
}

// VUE выполнит код ниже, когда интерфейс программы уже загрузится
onMounted(async()=>{
  try{
    // Открываем бд
    db = await Database.load("sqlite:messenger.db");

    // Загружаем из базы старые сообщения
    await loadUsers();
    await loadChats();

    if (chats.value.length > 0){
      await selectChat(chats.value[0]);
    }

    // Показываем успешеное состоние
    status.value = "История сохраняется локально";
  }catch (error){
    console.error(error);

    status.value = "Ошибка подключения к базе";
  }
});

</script>

<template>
  <main class="app">
    <AppHeader
        v-if="currentUser"
        :status="status"
        :users="users"
        :current-user="currentUser"
        @select="selectUser"
        @profile="openProfile"
    />
    <p v-else class="boot-status">{{ status }}</p>
    <p v-if="forwardNotice" class="forward-notice" role="status">{{ forwardNotice }}</p>
    <div
        v-if="currentUser"
        class="workspace"
    >
      <ChatSidebar
          :chats="chats"
          :active-chat-id="activeChatId"
          @select="selectChat"
      />
      <section class="chat">
        <template v-if="activeChat">
          <div class="chat-info">
            <h2>{{ activeChat.title }}</h2>
            <p>{{ activeChat.subtitle }}</p>
          </div>
          <MessageList
              :key="activeChat.id"
              :messages="messages"
              :current-user-id="currentUser.id"
              @edit="onEdit"
              @copy="onCopy"
              @forward="onForward"
              @delete="onDelete"
          />
          <MessageComposer
              :editing-message="editingMessage"
              :deleting-message="deletingMessage"
              @send="sendMessage"
              @sendImage="sendImage"
              @save-edit="editMessage"
              @delete-message="deleteMessage"
              @cancel-edit="cancelEdit"
              @cancel-delete="cancelDelete"
          />
        </template>
      </section>
    </div>
    <ProfileEditor
        v-if="isProfileOpen && currentUser"
        :key="currentUser.id"
        :user="currentUser"
        @save="saveProfile"
        @close="closeProfile"
    ></ProfileEditor>
    <ForwardMessageDialog
        v-if="forwardingMessage"
        :message="forwardingMessage"
        :chats="chats"
        :busy="isForwarding"
        :error="forwardingError"
        @confirm="confirmForward"
        @close="cancelForward"
    />
  </main>
</template>

<style scoped>
/* Все элементы будут использовать одну модель размеров */
:global(*){
  box-sizing: border-box;
}

:global(html){
  background: #111318;
  color-scheme: dark;
}

:global(body){
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

.workspace{
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.app{
  height: 100vh;
  display: flex;
  flex-direction: column;
  /*
      Запретит всему app прокручиваться
      Разрешим прокрутку только для MessageList
  */
  overflow: hidden;
}

.boot-status{
  margin: 24px;
  color: #858c98;
}

.forward-notice {
  margin: 0;
  padding: 10px 24px;
  color: #bbd4ff;
  background: #1b2944;
  font-size: 13px;
}

.chat{
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Потому что chat целиком не должен прокручиваться, только MessageList внутри него */
}

.chat-info{
  padding: 20px 24px;
  border-bottom: 1px solid #252830;
}

.chat-info h2{
  margin: 0;
  font-size: 16px;
}

.chat-info p{
  margin: 5px 0 0;
  color: #858c98;
  font-size: 13px;
}

</style>










