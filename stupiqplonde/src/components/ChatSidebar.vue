<script setup lang="ts">
import type { Chat } from "../types/chats";

defineProps<{
  chats: Chat[];

  activeChatId: number;
}>();

const emit = defineEmits<{
  select: [chat: Chat];
  create: [];
}>();

function selectChat(chat: Chat){
  emit("select", chat);
}
</script>

<template>
<aside class="sidebar">
  <div class="sidebar__header">
    <span>Чаты</span>
    <button
      type="button"
      class="sidebar__create"
      @click="emit('create')"
    >
      Новый чат
    </button>
  </div>

  <div class="sidebar__list">
    <p v-if="chats.length === 0" class="sidebar__empty">Пока нет чатов</p>
    <button
      v-for="chat in chats"
      :key="chat.id"
      type="button"
      class="chat-button"
      :class="{
        'chat-button--active':
        chat.id === activeChatId
      }"
      @click="selectChat(chat)"
    >
      <div class="chat-button__row">
        <strong class="chat-button__title">
          {{ chat.title }}
        </strong>
        <span
          v-if="chat.unread_count > 0"
          class="unread-badge"
        >
          {{ chat.unread_count }}
        </span>
      </div>

      <span class="chat-button__subtitle">
        {{ chat.subtitle }}
      </span>
    </button>
  </div>
</aside>
</template>

<style scoped>
.sidebar{
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  min-height: 0;

  border-right: 1px solid #252830;

  background: #15171c;
}

.sidebar__header{
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 18px;
  border-bottom: 1px solid #252830;
  font-weight: 600;
}

.sidebar__create{
  padding: 6px 10px;
  border: 1px solid #343842;
  border-radius: 6px;
  cursor: pointer;
  background: #20232a;
  color: #afb5c0;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
}

.sidebar__list{
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar__empty{
  margin: 12px 8px;
  color: #858c98;
  font-size: 13px;
}

.chat-button{
  width: 100%;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #f2f3f5;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.chat-button:hover{
  background: #20232a;
}

.chat-button--active{
  background: #292c34;
}
.chat-button__row{
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-button__title{
  font-size: 14px;
}

.chat-button__subtitle{
  color: #858c98;
  font-size: 12px;
}

.unread-badge{
  flex-shrink: 0;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #3d6df2;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}


</style>