<script setup lang="ts">

import type { Login, PasswordUpdate, Registration, User } from "./types/user";

// Импорт 2 функций из vue
// onMounted - запускает код после появления компонента
// ref -  создает быстрые перемещения
import { computed, onMounted, ref } from "vue";

import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";

import AppHeader from "./components/AppHeader.vue";

import MessageList from "./components/MessageList.vue";

import MessageComposer from "./components/MessageComposer.vue";

import ChatSidebar from "./components/ChatSidebar.vue";

import type { Chat, CreateChat, CreateChannel } from "./types/chats";

import type { ChannelPost, Message, MessageDelete, MessageEdit } from "./types/message.ts";

import type {ProfileUpdate} from "./types/user";

import ProfileEditor from "./components/ProfileEditor.vue";
import ForwardMessageDialog from "./components/ForwardMessageDialog.vue";
import CreateChatDialog from "./components/CreateChatDialog.vue";
import CreateChannelDialog from "./components/CreateChannelDialog.vue";
import JoinChannelDialog from "./components/JoinChannelDialog.vue";
import AuthDialog from "./components/AuthDialog.vue";
import AccountPanel from "./components/AccountPanel.vue";
import AppIcon from "./components/AppIcon.vue";
import UserAvatar from "./components/UserAvatar.vue";
import { initializeAccounts, loginAccount, registerAccount, changePassword } from "./services/accounts";
import { generateInviteCode } from "./services/inviteCode";
import { joinChannel as persistJoinChannel, loadChannelInteractions, addComment as persistComment, toggleReaction as persistReaction } from "./services/channels";
import { forwardMessage as persistForwardMessage } from "./services/forwardMessage";

const isProfileOpen = ref(false);
const isAccountOpen = ref(false);
const isAuthOpen = ref(true);
const authReady = ref(false);
const isConnecting = ref(false);
const isAuthenticating = ref(false);
const authError = ref("");
const authCandidates = ref<User[]>([]);
const authorizedIds = ref<number[]>([]);
const accountError = ref("");
const isSavingAccount = ref(false);
const profileError = ref("");
const chatFilter = ref("all");
const sessionAccounts = computed(() => users.value.filter(user => authorizedIds.value.includes(user.id)));

function resetAuth(){
  if (authReady.value) authError.value = "";
  authCandidates.value = [];
}

function addAccount(){
  if (isBusy.value) return;
  isAccountOpen.value = false;
  resetAuth();
  isAuthOpen.value = true;
}

function closeAuth(){
  if (isAuthenticating.value || !currentUser.value) return;
  isAuthOpen.value = false;
  resetAuth();
}

async function activateAccount(user: User){
  if (isAuthenticating.value || !authCandidates.value.some(account => account.id === user.id)) return;
  isAuthenticating.value = true;
  try {
    const existing = users.value.find(account => account.id === user.id);
    if (existing) Object.assign(existing, user);
    else users.value.push(user);
    if (!authorizedIds.value.includes(user.id)) authorizedIds.value.push(user.id);
    await selectUser(user);
    isAuthOpen.value = false;
    resetAuth();
  } catch (error) {
    console.error(error);
    // Вход уже выполнен; список разговоров можно загрузить повторно.
    isAuthOpen.value = false;
    forwardNotice.value = "Вы вошли в аккаунт, но список разговоров не загрузился. Выберите аккаунт повторно.";
  } finally {
    isAuthenticating.value = false;
  }
}

async function login(payload: Login){
  if (!db || !authReady.value || isAuthenticating.value) return;
  isAuthenticating.value = true;
  resetAuth();
  try {
    authCandidates.value = await loginAccount(db, payload);
  } catch (error) {
    authError.value = error instanceof Error ? error.message : "Не удалось войти. Повторите попытку.";
  } finally {
    isAuthenticating.value = false;
  }
  if (authCandidates.value.length === 1) await activateAccount(authCandidates.value[0]);
}

async function register(payload: Registration){
  if (!db || !authReady.value || isAuthenticating.value) return;
  isAuthenticating.value = true;
  resetAuth();
  try {
    const user = await registerAccount(db, payload);
    users.value.push(user);
    authCandidates.value = [user];
  } catch (error) {
    authError.value = error instanceof Error ? error.message : "Не удалось создать аккаунт.";
  } finally {
    isAuthenticating.value = false;
  }
  if (authCandidates.value.length === 1) await activateAccount(authCandidates.value[0]);
}

async function logout(){
  if (isBusy.value || !currentUser.value) return;
  const userId = currentUser.value.id;
  authorizedIds.value = authorizedIds.value.filter(id => id !== userId);
  isAccountOpen.value = false;
  isProfileOpen.value = false;
  clearActiveChat();
  chats.value = [];
  currentUser.value = null;
  forwardNotice.value = "";
  pendingChannelId.value = null;
  if (sessionAccounts.value[0]) {
    await selectUser(sessionAccounts.value[0]);
  } else {
    resetAuth();
    isAuthOpen.value = true;
  }
}

async function savePassword(payload: PasswordUpdate){
  if (!db || !currentUser.value || isBusy.value) return;
  isSavingAccount.value = true;
  accountError.value = "";
  try {
    await changePassword(db, currentUser.value.id, payload.currentPassword, payload.newPassword);
    isAccountOpen.value = false;
    forwardNotice.value = "Пароль изменён.";
  } catch (error) {
    accountError.value = error instanceof Error ? error.message : "Не удалось изменить пароль.";
  } finally {
    isSavingAccount.value = false;
  }
}

function openAccount(){
  if (!currentUser.value || isBusy.value) return;
  accountError.value = "";
  isAccountOpen.value = true;
}

function openProfile(){
  isAccountOpen.value = false;
  profileError.value = "";
  isProfileOpen.value = true;
}

function closeProfile(){
  if (isSavingAccount.value) return;
  isProfileOpen.value = false;
}


async function saveProfile( profile: ProfileUpdate, ){
  if (!db) return;
  if (!currentUser.value) return;

  if (isBusy.value) return;
  isSavingAccount.value = true;
  profileError.value = "";
  try {
    await db.execute(
        `
          UPDATE users
          SET
              display_name = $1,
              status = $2,
              avatar_path = $3
          WHERE id = $4
        `,
        [
            profile.displayName,
            profile.status,
            profile.avatarPath,
            currentUser.value.id,
        ],
    );

    currentUser.value.display_name = profile.displayName;
    currentUser.value.status = profile.status;
    currentUser.value.avatar_path = profile.avatarPath;
    isProfileOpen.value = false;
  } catch (error) {
    console.error(error);
    profileError.value = "Не удалось сохранить профиль. Повторите попытку.";
  } finally {
    isSavingAccount.value = false;
  }
  if (!isProfileOpen.value && activeChat.value) {
    try {
      await loadMessages(activeChat.value.id);
    } catch {
      forwardNotice.value = "Профиль сохранён. Откройте разговор заново, чтобы обновить имена и фотографии.";
    }
  }
}

const users = ref<User[]>([]);

const currentUser = ref<User | null>(null);

const otherUsers = computed(() =>
  users.value.filter(user => user.id !== currentUser.value?.id),
);

async function selectUser(user: User){
  if (isBusy.value) return;
  if (!authorizedIds.value.includes(user.id)) return;
  isAccountOpen.value = false;
  isProfileOpen.value = false;
  const previousChatId = activeChat.value?.id;
  editingMessage.value = null;
  deletingMessage.value = null;
  forwardingMessage.value = null;
  isCreateChatOpen.value = false;
  isCreateChannelOpen.value = false;
  isJoinChannelOpen.value = false;
  forwardNotice.value = "";
  pendingChannelId.value = null;
  clearActiveChat();
  chats.value = [];
  currentUser.value = users.value.find(account => account.id === user.id) ?? user;
  isNavigating.value = true;
  try {
    await loadChats();

    const stillVisible = chats.value.find(chat => chat.id === previousChatId);

    if (stillVisible) {
      await selectChat(stillVisible);
      return;
    }

    if (chats.value.length > 0) {
      await selectChat(chats.value[0]);
      return;
    }

    clearActiveChat();
  } catch (error) {
    console.error(error);
    clearActiveChat();
    forwardNotice.value = "Не удалось загрузить разговоры. Выберите аккаунт повторно.";
  } finally {
    isNavigating.value = false;
  }
}

function clearActiveChat(){
  activeChat.value = null;
  activeChatId.value = 0;
  messages.value = [];
  editingMessage.value = null;
  deletingMessage.value = null;
  forwardingMessage.value = null;
}

// Создаем структуру одного сообщения

// Список сообщений, которые vue отображет в диалоге на экране
const messages = ref<ChannelPost[]>([]);

const chats = ref<Chat[]>([]);

const activeChat = ref<Chat | null>(null);

const activeChatId = ref(1);

const editingMessage = ref<Message | null>(null);

const deletingMessage = ref<Message | null>(null);
const forwardingMessage = ref<Message | null>(null);
const isForwarding = ref(false);
const forwardingError = ref("");
const forwardNotice = ref("");
const isCreateChatOpen = ref(false);
const isCreatingChat = ref(false);
const createChatError = ref("");
const isCreateChannelOpen = ref(false);
const isCreatingChannel = ref(false);
const createChannelError = ref("");
const isJoinChannelOpen = ref(false);
const isJoiningChannel = ref(false);
const joinChannelError = ref("");
const isNavigating = ref(false);
const isSavingMessage = ref(false);
const messageError = ref("");
const submittedMessage = ref(0);
const pendingChannelId = ref<number | null>(null);
const isRefreshingChannel = ref(false);
const isBusy = computed(() => isNavigating.value || isCreatingChat.value || isCreatingChannel.value || isJoiningChannel.value || isForwarding.value || isSavingMessage.value || isRefreshingChannel.value || isSavingAccount.value);
const canPublish = computed(() => Boolean(activeChat.value && currentUser.value && (
  activeChat.value.kind === "chat" || (
    activeChat.value.owner_id === currentUser.value.id && activeChat.value.my_role === "owner"
  )
)));
const writableChats = computed(() => chats.value.filter(chat => chat.kind === "chat" || (
  chat.owner_id === currentUser.value?.id && chat.my_role === "owner"
)));

function openCreateChannel() {
  createChannelError.value = "";
  isCreateChannelOpen.value = true;
}

function closeCreateChannel() {
  if (!isCreatingChannel.value) isCreateChannelOpen.value = false;
}

function openJoinChannel() {
  joinChannelError.value = "";
  isJoinChannelOpen.value = true;
}

function closeJoinChannel() {
  if (!isJoiningChannel.value) isJoinChannelOpen.value = false;
}

async function refreshChannel(chatId: number) {
  pendingChannelId.value = chatId;
  try {
    await loadChats();
    const channel = chats.value.find(chat => chat.id === chatId);
    if (!channel) throw new Error("Канал недоступен.");
    await selectChat(channel);
    pendingChannelId.value = null;
    forwardNotice.value = "";
  } catch (error) {
    console.error(error);
    forwardNotice.value = "Канал сохранён, но не удалось его загрузить. Повторите загрузку.";
  }
}

async function retryChannel() {
  if (pendingChannelId.value === null || isBusy.value) return;
  isRefreshingChannel.value = true;
  try {
    await refreshChannel(pendingChannelId.value);
  } finally {
    isRefreshingChannel.value = false;
  }
}

async function createChannel(payload: CreateChannel) {
  if (!db || !currentUser.value || isBusy.value) return;
  isCreatingChannel.value = true;
  createChannelError.value = "";
  let chatId: number;
  try {
    chatId = await invoke<number>("create_channel", {
      payload: { ...payload, ownerId: currentUser.value.id, inviteCode: generateInviteCode() },
    });
  } catch (error) {
    createChannelError.value = String(error);
    isCreatingChannel.value = false;
    return;
  }
  // Канал уже сохранён: закрываем форму, чтобы ошибка загрузки не привела к дубликату.
  isCreateChannelOpen.value = false;
  try { await refreshChannel(chatId); }
  finally { isCreatingChannel.value = false; }
}

async function joinChannel(code: string) {
  if (!db || !currentUser.value || isBusy.value) return;
  isJoiningChannel.value = true;
  joinChannelError.value = "";
  let chatId: number;
  try {
    chatId = await persistJoinChannel(db, code, currentUser.value.id);
  } catch (error) {
    joinChannelError.value = error instanceof Error ? error.message : String(error);
    isJoiningChannel.value = false;
    return;
  }
  isJoinChannelOpen.value = false;
  try { await refreshChannel(chatId); }
  finally { isJoiningChannel.value = false; }
}

async function copyInviteCode() {
  if (!activeChat.value?.invite_code || !canPublish.value) return;
  try {
    await navigator.clipboard.writeText(activeChat.value.invite_code);
    forwardNotice.value = "Код приглашения скопирован.";
  } catch {
    forwardNotice.value = "Не удалось скопировать код. Скопируйте его из заголовка канала.";
  }
}

async function updatePost(messageId: number, action: (userId: number) => Promise<void>) {
  const chatId = activeChat.value?.id;
  const userId = currentUser.value?.id;
  if (!db || !chatId || !userId || activeChat.value?.kind !== "channel" || !messages.value.some(m => m.id === messageId)) {
    throw new Error("Пост недоступен.");
  }
  await action(userId);
  try {
    if (currentUser.value?.id === userId && activeChat.value?.id === chatId) await loadMessages(chatId);
  } catch {
    forwardNotice.value = "Изменение сохранено. Откройте канал заново, чтобы обновить публикации.";
  }
}

async function addComment(messageId: number, body: string) {
  const database = db;
  if (!database) throw new Error("База недоступна.");
  await updatePost(messageId, userId => persistComment(database, messageId, userId, body));
}

async function toggleReaction(messageId: number, emoji: string) {
  const database = db;
  if (!database) throw new Error("База недоступна.");
  await updatePost(messageId, userId => persistReaction(database, messageId, userId, emoji));
}

function openCreateChat(){
  createChatError.value = "";
  isCreateChatOpen.value = true;
}

function closeCreateChat(){
  if (isCreatingChat.value) return;
  isCreateChatOpen.value = false;
  createChatError.value = "";
}

async function createChat(payload: CreateChat){
  if (!db) return;
  if (!currentUser.value) return;
  if (payload.memberIds.length === 0) return;

  isCreatingChat.value = true;
  createChatError.value = "";

  try {
    const inserted = await db.execute(
      `
        INSERT INTO chats (title, subtitle)
        VALUES ($1, $2)
      `,
      [payload.title, payload.subtitle],
    );

    let chatId = inserted.lastInsertId;
    if (!chatId) {
      const rows = await db.select<{ id: number }[]>(
        "SELECT last_insert_rowid() AS id",
      );
      chatId = rows[0]?.id ?? 0;
    }
    if (!chatId) {
      throw new Error("Не удалось получить id чата");
    }
    const memberIds = new Set([currentUser.value.id, ...payload.memberIds]);

    for (const userId of memberIds) {
      await db.execute(
        `
          INSERT INTO chat_members (chat_id, user_id)
          VALUES ($1, $2)
        `,
        [chatId, userId],
      );
    }

    await loadChats();
    const created = chats.value.find(chat => chat.id === chatId);
    if (created) {
      await selectChat(created);
    }
    isCreateChatOpen.value = false;
  } catch (error) {
    console.error(error);
    createChatError.value =
      error instanceof Error ? error.message : "Не удалось создать чат";
  } finally {
    isCreatingChat.value = false;
  }
}

// Статус подключения к бд
const status = ref("Подключение...")

// Здесь будет подключение к бд (честно), но пока тут null
let db: Database | null = null;

async function loadChats(){
  if (!db) return;
  if (!currentUser.value) return;

  const userId = currentUser.value.id;
  const loaded = await db.select<Chat[]>(
    `
      SELECT
        chats.id,
        chats.title,
        chats.subtitle,
        chats.kind,
        chats.owner_id,
        chats.invite_code,
        chat_members.role AS my_role,
        COUNT(messages.id) AS unread_count
      FROM chats
      INNER JOIN chat_members
        ON chat_members.chat_id = chats.id
       AND chat_members.user_id = $1
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
      userId,
      userId,
    ],
  );
  if (currentUser.value?.id !== userId) return;
  chats.value = loaded;
  if (activeChat.value) activeChat.value = loaded.find(chat => chat.id === activeChatId.value) ?? null;
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
  isNavigating.value = true;
  try {
    activeChat.value = chat;

    activeChatId.value = chat.id;

    editingMessage.value = null;
    deletingMessage.value = null;
    messageError.value = "";
    messages.value = [];

    await loadMessages(chat.id);
    await markChatRead(chat.id);
    await loadChats();
  } finally {
    isNavigating.value = false;
  }
}

// Асинхронная функция загрузки сообщений из sql
async function loadMessages(chatId: number){
  // Если база еще не подключена, прерываем выполнение
  if (!db) return;
  const userId = currentUser.value?.id;
  if (!userId) return;
  const isChannel = activeChat.value?.id === chatId && activeChat.value.kind === "channel";

  // Читаем данные из таблицы messages
  const loaded = await db.select<Message[]>(
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
  const interactions = isChannel
    ? await loadChannelInteractions(db, chatId, userId)
    : { reactions: [], comments: [] };
  if (currentUser.value?.id !== userId || activeChat.value?.id !== chatId) return;
  messages.value = loaded.map(message => ({
    ...message,
    reactions: interactions.reactions.filter(r => r.message_id === message.id),
    comments: interactions.comments.filter(c => c.message_id === message.id),
  }));
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
}

// Черновик очищаем только после сохранения. Ошибка загрузки не отменяет публикацию.
async function saveMessage(action: () => Promise<unknown>, clearDraft = false){
  if (isBusy.value || !activeChat.value) return false;

  const chatId = activeChat.value.id;
  isSavingMessage.value = true;
  messageError.value = "";

  try {
    await action();
  } catch (error) {
    console.error(error);
    messageError.value = "Не удалось сохранить сообщение. Повторите попытку.";
    isSavingMessage.value = false;
    return false;
  }

  if (clearDraft) submittedMessage.value += 1;
  editingMessage.value = null;
  deletingMessage.value = null;

  try {
    await loadMessages(chatId);
    await markChatRead(chatId);
    await loadChats();
  } catch (error) {
    console.error(error);
    forwardNotice.value = "Изменение сохранено, но история не обновилась. Откройте чат или канал заново.";
  } finally {
    isSavingMessage.value = false;
  }
  return true;
}

async function sendMessage(body: string){
  if (!canPublish.value || isBusy.value) return;
  if (!db) return;

  if (!activeChat.value) return;

  if (!currentUser.value) return;

  if (!body.trim()) return;
  const database = db;
  const chatId = activeChat.value.id;
  const userId = currentUser.value.id;
  await saveMessage(() => database.execute(
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
          chatId,
          userId,
          "text",
          body.trim(),
          null,
      ],
  ), true);
}

function onDelete(message: Message){
  if (isBusy.value) return;
  if (!canPublish.value || message.author_id !== currentUser.value?.id) return;
  editingMessage.value = null;
  deletingMessage.value = message;
}

function cancelDelete(){
  if (isSavingMessage.value) return;
  deletingMessage.value = null;
}

async function deleteMessage(dellmess: MessageDelete){
  if (!canPublish.value || isBusy.value) return;
  if (!db) return;

  if (!activeChat.value) return;

  if (!currentUser.value) return;

  const database = db;
  const chatId = activeChat.value.id;
  const userId = currentUser.value.id;
  await saveMessage(() => database.execute(
      `
        DELETE FROM messages
        WHERE id = $1 AND author_id = $2 AND chat_id = $3
      `,
      [dellmess.id, userId, chatId],
  ));
}

async function sendImage(path:string){
  if (!canPublish.value || isBusy.value) return;
  if(!db)
    return;

  if (!activeChat.value)
    return;

  if (!currentUser.value) return;

  const database = db;
  const chatId = activeChat.value.id;
  const userId = currentUser.value.id;
  await saveMessage(() => database.execute(
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
          chatId,
          userId,
          "image",
          null,
          path,
      ]
  ));
}

function onEdit(message: Message){
  if (isBusy.value) return;
  if (!canPublish.value || message.author_id !== currentUser.value?.id) return;
  deletingMessage.value = null;
  editingMessage.value = message;
}

function cancelEdit(){
  if (isSavingMessage.value) return;
  editingMessage.value = null;
}

async function editMessage(edit: MessageEdit){
  if (!canPublish.value || !currentUser.value || isBusy.value) return;
  if (!db) return;

  if (!activeChat.value) return;

  if (!edit.body.trim()) return;
  const database = db;
  const chatId = activeChat.value.id;
  const userId = currentUser.value.id;
  await saveMessage(() => database.execute(
      `
        UPDATE messages
        SET
          body = $1,
          edited_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND author_id = $3 AND chat_id = $4
      `,
      [
          edit.body.trim(),
          edit.id,
          userId,
          chatId,
      ],
  ), true);
}

async function onCopy(message: Message){
  const text = message.body ?? "";

  if (!text) return;

  await navigator.clipboard.writeText(text);
}

function onForward(message: Message){
  if (isBusy.value) return;
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
async function connectDatabase(){
  if (isConnecting.value || authReady.value) return;
  isConnecting.value = true;
  authError.value = "";
  let stage = "Подключение к базе";
  try{
    // Открываем бд
    db = await Database.load("sqlite:messenger.db");
    stage = "Подготовка аккаунтов";
    await initializeAccounts(db);

    // Загружаем из базы старые сообщения
    stage = "Загрузка пользователей";
    await loadUsers();
    authReady.value = true;

    // Показываем успешеное состоние
    status.value = "История сохраняется локально";
  }catch (error){
    console.error(error);

    status.value = `${stage}: ошибка`;
    const detail = error instanceof Error ? error.message : String(error);
    authError.value = `${stage}: ${detail}`;
  } finally {
    isConnecting.value = false;
  }
}
onMounted(connectDatabase);

</script>
<template>
  <main class="app">
    <div class="app-shell" :inert="isAuthOpen || isAccountOpen || isProfileOpen || isCreateChatOpen || isCreateChannelOpen || isJoinChannelOpen || Boolean(forwardingMessage)">
      <nav class="navigation-rail" aria-label="Разделы приложения">
        <button type="button" class="rail-brand" aria-label="Все разговоры" :disabled="isBusy || !currentUser" @click="chatFilter = 'all'">e<span>·</span></button>
        <div class="rail-divider"></div>
        <button type="button" class="rail-button" :class="{ active: chatFilter === 'all' }" title="Все разговоры" aria-label="Все разговоры" :disabled="isBusy || !currentUser" @click="chatFilter = 'all'"><AppIcon name="chat" :size="23" /></button>
        <button type="button" class="rail-button" :class="{ active: chatFilter === 'channel' }" title="Каналы" aria-label="Каналы" :disabled="isBusy || !currentUser" @click="chatFilter = 'channel'"><AppIcon name="hash" :size="24" /></button>
        <button type="button" class="rail-button rail-add" title="Новый разговор" aria-label="Новый чат" :disabled="isBusy || !currentUser" @click="openCreateChat"><AppIcon name="plus" :size="23" /></button>
        <div class="rail-spacer"></div>
        <button type="button" class="rail-account" title="Мой аккаунт" aria-label="Управление аккаунтом" :disabled="isBusy || !currentUser" @click="openAccount"><UserAvatar v-if="currentUser" :user="currentUser" :size="33" /><AppIcon v-else name="user" /></button>
      </nav>
      <ChatSidebar :key="currentUser?.id ?? 0" :chats="chats" :active-chat-id="activeChatId" :busy="isBusy" :current-user="currentUser" :filter="chatFilter"
        @select="chat => { if (!isBusy) selectChat(chat); }" @create="openCreateChat" @create-channel="openCreateChannel" @join-channel="openJoinChannel" @account="openAccount" />
      <div class="workspace">
        <AppHeader :status="status" />
        <div v-if="forwardNotice" class="forward-notice" role="status">
          <span>{{ forwardNotice }}</span>
          <button v-if="pendingChannelId !== null" type="button" :disabled="isBusy" @click="retryChannel">{{ isRefreshingChannel ? 'Загружаю…' : 'Повторить загрузку' }}</button>
          <button v-else type="button" class="icon-button" aria-label="Скрыть уведомление" @click="forwardNotice = ''"><AppIcon name="close" :size="15" /></button>
        </div>
        <section class="chat">
          <template v-if="activeChat && currentUser">
            <header class="chat-info">
              <span class="chat-symbol"><AppIcon :name="activeChat.kind === 'channel' ? 'hash' : 'chat'" :size="23" /></span>
              <div class="chat-heading"><h2>{{ activeChat.title }}</h2><p>{{ activeChat.subtitle || (activeChat.kind === 'channel' ? 'Публикации и обсуждения' : 'Хорошие разговоры начинаются здесь') }}</p></div>
              <span v-if="activeChat.kind === 'channel'" class="channel-label">{{ canPublish ? 'Ваш канал' : 'Канал' }}</span>
            </header>
            <div v-if="activeChat.kind === 'channel' && canPublish && activeChat.invite_code" class="channel-invite"><AppIcon name="user" :size="14" /><span>Пригласите друзей</span><code>{{ activeChat.invite_code }}</code><button type="button" @click="copyInviteCode">Скопировать код</button></div>
            <MessageList :key="`${activeChat.id}:${currentUser.id}`" :messages="messages" :current-user-id="currentUser.id" :is-channel="activeChat.kind === 'channel'" :can-publish="canPublish" :add-comment="addComment" :toggle-reaction="toggleReaction"
              @edit="onEdit" @copy="onCopy" @forward="onForward" @delete="onDelete" />
            <MessageComposer v-if="canPublish" :key="`${activeChat.id}:${currentUser.id}`" :editing-message="editingMessage" :disabled="isBusy" :error="messageError" :submitted-message="submittedMessage" :is-channel="activeChat.kind === 'channel'" :deleting-message="deletingMessage"
              @send="sendMessage" @send-image="sendImage" @save-edit="editMessage" @delete-message="deleteMessage" @cancel-edit="cancelEdit" @cancel-delete="cancelDelete" />
            <p v-else class="subscriber-hint"><AppIcon name="lock" :size="14" />Публикации создаёт владелец. Обсуждайте их в комментариях.</p>
          </template>
          <div v-else class="welcome">
            <div class="welcome-art"><span class="welcome-orbit orbit-one"></span><span class="welcome-orbit orbit-two"></span><div class="welcome-bubble"><AppIcon name="chat" :size="47" /></div><span class="welcome-spark">✦</span></div>
            <p class="welcome-eyebrow">МЕНЬШЕ ШУМА. БОЛЬШЕ ОБЩЕНИЯ.</p>
            <h1>{{ currentUser ? `Привет, ${currentUser.display_name}.` : 'Разговор начинается здесь.' }}</h1>
            <p>Близкие люди, любимые темы и ваши разговоры.<br />Всё в одном спокойном пространстве.</p>
            <button v-if="currentUser" type="button" class="primary-button" :disabled="isBusy" @click="openCreateChat"><AppIcon name="plus" :size="16" />Начать разговор</button>
            <span class="welcome-caption">Encore 67 · Оставайтесь на связи</span>
          </div>
        </section>
      </div>
    </div>
    <AuthDialog v-if="isAuthOpen" :busy="isAuthenticating || isConnecting" :ready="authReady" :error="authError" :accounts="authCandidates" :can-close="Boolean(currentUser)" @retry="connectDatabase" @login="login" @register="register" @select="activateAccount" @reset="resetAuth" @close="closeAuth" />
    <AccountPanel v-if="isAccountOpen && currentUser" :user="currentUser" :accounts="sessionAccounts" :busy="isBusy" :error="accountError" @select="selectUser" @profile="openProfile" @add="addAccount" @logout="logout" @password="savePassword" @close="isAccountOpen = false" />
    <ProfileEditor v-if="isProfileOpen && currentUser" :key="currentUser.id" :user="currentUser" :busy="isSavingAccount" :error="profileError" @save="saveProfile" @close="closeProfile" />
    <ForwardMessageDialog v-if="forwardingMessage" :message="forwardingMessage" :chats="writableChats" :busy="isForwarding" :error="forwardingError" @confirm="confirmForward" @close="cancelForward" />
    <CreateChatDialog v-if="isCreateChatOpen && currentUser" :users="otherUsers" :busy="isCreatingChat" :error="createChatError" @create="createChat" @close="closeCreateChat" />
    <CreateChannelDialog v-if="isCreateChannelOpen && currentUser" :users="otherUsers" :busy="isCreatingChannel" :error="createChannelError" @create="createChannel" @close="closeCreateChannel" />
    <JoinChannelDialog v-if="isJoinChannelOpen && currentUser" :busy="isJoiningChannel" :error="joinChannelError" @join="joinChannel" @close="closeJoinChannel" />
  </main>
</template>

<style scoped>
.app { height: 100dvh; overflow: hidden; background: var(--surface); }
.app-shell { display: flex; height: 100%; min-width: 620px; }
.navigation-rail { width: 64px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 13px 8px; border-right: 1px solid var(--border); background: #e9ecf2; }
.rail-brand { width: 40px; height: 40px; border: 0; border-radius: 13px; background: var(--text); color: white; font-size: 30px; letter-spacing: -3px; font-weight: 600; padding: 0 3px 3px 0; }.rail-brand span { color: #6eb8ff; }.rail-divider { width: 26px; height: 1px; background: #d3d8e2; margin: 0 0 2px; }
.rail-button { position: relative; width: 42px; height: 42px; display: grid; place-items: center; border: 0; border-radius: 14px; background: #f7f8fb; color: #8b96aa; }.rail-button.active { background: var(--accent); color: white; box-shadow: 0 4px 12px #007aff20; }.rail-button.active::before { content: ''; position: absolute; left: -10px; width: 3px; height: 20px; border-radius: 0 3px 3px 0; background: var(--accent); }.rail-add { color: var(--accent); border: 1px dashed #c7cfdd; background: none; }.rail-spacer { flex: 1; }.rail-account { display: grid; place-items: center; background: none; border: 0; padding: 0; color: var(--muted); }
.workspace { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }.chat { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--surface); }
.chat-info { display: flex; align-items: center; gap: 13px; padding: 20px 26px; border-bottom: 1px solid var(--border); min-height: 79px; }.chat-symbol { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; background: var(--accent-soft); color: var(--accent); flex-shrink: 0; }.chat-heading { min-width: 0; flex: 1; }.chat-heading h2 { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -.3px; overflow-wrap: anywhere; }.chat-heading p { margin: 6px 0 0; font-size: 11px; color: var(--muted); overflow-wrap: anywhere; }.channel-label { font-size: 10px; background: var(--background); color: var(--muted); padding: 6px 9px; border-radius: 7px; white-space: nowrap; }
.channel-invite { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 9px 26px; background: #f8fbff; border-bottom: 1px solid var(--border); font-size: 10px; color: var(--muted); }.channel-invite code { color: var(--accent); letter-spacing: .07em; user-select: all; }.channel-invite button { margin-left: auto; border: 0; background: none; color: var(--accent); font-size: 10px; }
.subscriber-hint { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 24px; margin: 0; border-top: 1px solid var(--border); color: var(--muted); background: var(--background); font-size: 11px; }
.forward-notice { display: flex; align-items: center; gap: 10px; padding: 10px 20px; background: var(--accent-soft); color: var(--accent); font-size: 11px; }.forward-notice span { flex: 1; }.forward-notice button:not(.icon-button) { border: 0; background: none; color: inherit; font-size: 11px; font-weight: 600; }
.welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; height: 100%; text-align: center; }.welcome-art { position: relative; width: 190px; height: 145px; display: grid; place-items: center; margin-bottom: 18px; }.welcome-bubble { z-index: 1; display: grid; place-items: center; width: 91px; height: 91px; border-radius: 28px; background: var(--accent-soft); color: var(--accent); transform: rotate(-8deg); box-shadow: 0 14px 35px #007aff0c; }.welcome-orbit { position: absolute; width: 144px; height: 144px; border: 1px solid #e9edf4; border-radius: 50%; }.orbit-two { width: 190px; height: 190px; border-style: dashed; opacity: .6; }.welcome-spark { position: absolute; right: 32px; top: 20px; color: #9cbae1; font-size: 27px; }
.welcome-eyebrow { font-size: 8px !important; letter-spacing: .17em; font-weight: 600; color: #8b96aa !important; }.welcome h1 { font-size: clamp(21px, 2.7vw, 30px); letter-spacing: -.8px; font-weight: 600; margin: 9px 0 2px; }.welcome > p { color: var(--muted); font-size: 12px; line-height: 1.9; margin: 14px 0 20px; }.welcome-caption { margin-top: 30px; font-size: 9px; color: #a2a9b5; }
@media (max-width: 720px) { .navigation-rail { width: 54px; }.chat-info { padding: 16px; }.channel-label { display: none; }.welcome { padding: 20px; } }
</style>
