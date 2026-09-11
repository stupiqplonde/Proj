<script setup lang="ts">
import {
  nextTick,
  onMounted,
  useTemplateRef,
  watch,
} from "vue";

import MessageBubble from "./MessageBubble.vue";

import type { Message } from "../types/messages.ts";
import type { Reaction } from "../types/reactions.ts";

const props = defineProps<{
  messages: Message[];
  reactions: Reaction[];
  currentUserName: string;
  reactionMessageId: number | null;
}>();

const emit = defineEmits<{
  toggleReaction: [messageId: number, emoji: string];
  requestReaction: [messageId: number];
}>();

const bottomAnchor = useTemplateRef<HTMLDivElement>("bottom-anchor");

async function scrollToBottom() {
  await nextTick();

  bottomAnchor.value?.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}

function getMessageCount() {
  return props.messages.length;
}

function reactionsFor(messageId: number) {
  return props.reactions.filter((reaction) => reaction.message_id === messageId);
}

watch(getMessageCount, scrollToBottom);

onMounted(scrollToBottom);
</script>

<template>
  <div class="messages">
    <div class="messages-inner">
      <div
        v-if="messages.length === 0"
        class="empty"
      >
        <strong> Здесь пока пусто </strong>
        <span> Напишите первое сообщение</span>
      </div>

      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :is-own="message.author === currentUserName"
        :reactions="reactionsFor(message.id)"
        :current-user-name="currentUserName"
        :reaction-picker-open="reactionMessageId === message.id"
        @toggle-reaction="(emoji) => emit('toggleReaction', message.id, emoji)"
        @request-reaction="emit('requestReaction', message.id)"
      />
      <div
        ref="bottom-anchor"
        class="bottom-anchor"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.bottom-anchor {
  height: 1px;
  flex-shrink: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px 24px;
}

.messages-inner {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
}

.empty {
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: #858c98;
}
</style>
