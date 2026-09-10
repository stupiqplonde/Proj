<script setup lang="ts">
import type { ConversationPreview } from "../types/conversation";
import type { Message } from "../types/messages";

defineProps<{
  open: boolean;
  chats: ConversationPreview[];
  message: Message | null;
}>();

const emit = defineEmits<{
  close: [];
  pick: [conversationId: number];
}>();
</script>

<template>
  <div v-if="open && message" class="overlay" @click.self="emit('close')">
    <div class="sheet">
      <h3>Переслать</h3>
      <p>{{ message.body }}</p>
      <button
        v-for="chat in chats"
        :key="chat.id"
        type="button"
        @click="emit('pick', chat.id)"
      >
        {{ chat.title }}
      </button>
      <button class="cancel" type="button" @click="emit('close')">Отмена</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(4, 10, 16, 0.55);
  animation: rise 0.16s ease;
}

.sheet {
  width: min(420px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: 18px;
  background: #17212b;
  box-shadow: var(--shadow);
}

h3 {
  margin: 0;
}

p {
  margin: 0 0 8px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #242f3d;
  cursor: pointer;
  text-align: left;
}

.cancel {
  text-align: center;
  color: var(--muted);
}
</style>
