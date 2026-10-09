<script setup lang="ts">
import {
  nextTick,       // Позволяет дождаться момента, когда Vue обновит HTML
  onMounted,
  useTemplateRef, // Дает возможность получить ссылку на html-элемент из template
  watch,          // озволяет следть за изменение выбранных данных
} from "vue";

import MessageBubble from "./MessageBubble.vue";
import ChannelPostActions from "./ChannelPostActions.vue";

import type {ChannelPost, Message} from "../types/message.ts";

const props = defineProps<{
  messages: ChannelPost[];
  currentUserId: number;
  isChannel: boolean;
  canPublish: boolean;
  addComment: (messageId: number, body: string) => Promise<void>;
  toggleReaction: (messageId: number, emoji: string) => Promise<void>;
}>();

const emit = defineEmits<{
  edit: [message: Message];
  copy: [message: Message];
  forward: [message: Message];
  delete: [message: Message];
}>();

const bottomAnchor = useTemplateRef<HTMLDivElement>("bottom-anchor");

async function scrollToBottom(){
  /* Нужно дождаться обновления DOM */
  await nextTick();

  bottomAnchor.value?.scrollIntoView({
    behavior: "smooth",

    block: "end",
  });
}

function getMessageCount(){
  return props.messages.length;
}

watch(
    getMessageCount,
    scrollToBottom,
);

onMounted(scrollToBottom);
</script>

<template>
  <div class="messages">
    <!-- Данный див будет отображаться когда сообщений нет -->
    <div class="messages-inner">
      <div
          v-if="messages.length === 0"
          class="empty"
      >
        <strong> Здесь пока пусто </strong>
        <span>{{ isChannel ? 'Здесь появятся публикации владельца канала' : 'Напишите первое сообщение' }}</span>
      </div>
      <!-- Vue создает article для каждого сообщения из базы -->
      <div v-for="message in messages" :key="message.id" class="message-row" :class="{ 'message-row--channel': isChannel }">
        <MessageBubble
          :message="message"
          :is-own="message.author_id === currentUserId && canPublish"
          @edit="emit('edit', $event)"
          @copy="emit('copy', $event)"
          @forward="emit('forward', $event)"
          @delete="emit('delete', $event)"
      />
        <ChannelPostActions v-if="isChannel" :post="message" :add-comment="addComment" :toggle-reaction="toggleReaction" />
      </div>
      <div
        ref="bottom-anchor"
        class="bottom-anchor"
        aria-hidden="true"
      >
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-row { display: flex; flex-direction: column; gap: 6px; }
.message-row--channel :deep(.message) { align-self: flex-start; width: 100%; max-width: 100%; }
.bottom-anchor{
  height: 1px;
  flex-shrink: 0;
}

.messages{
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}

.messages-inner{
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 3px;
}

.empty{
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: var(--muted);
}

</style>
