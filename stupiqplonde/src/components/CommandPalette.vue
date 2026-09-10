<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ConversationPreview } from "../types/conversation";
import type { Message } from "../types/messages";

const props = defineProps<{
  open: boolean;
  chats: ConversationPreview[];
  messages: Message[];
}>();

const emit = defineEmits<{
  close: [];
  jump: [payload: { conversationId: number; messageId?: number }];
}>();

const query = ref("");
const cursor = ref(0);

const hits = computed(() => {
  const q = query.value.trim().toLowerCase();
  const chatHits = props.chats
    .filter((chat) => !q || chat.title.toLowerCase().includes(q) || chat.lastBody.toLowerCase().includes(q))
    .map((chat) => ({
      key: `c-${chat.id}`,
      kind: "chat" as const,
      title: chat.title,
      subtitle: chat.lastBody,
      conversationId: chat.id,
    }));
  const messageHits = q
    ? props.messages
        .filter((item) => !item.deleted && item.body.toLowerCase().includes(q))
        .slice(-24)
        .reverse()
        .map((item) => ({
          key: `m-${item.id}`,
          kind: "message" as const,
          title: item.body,
          subtitle: item.author,
          conversationId: item.conversation_id,
          messageId: item.id,
        }))
    : [];
  return [...chatHits, ...messageHits].slice(0, 30);
});

watch(
  () => props.open,
  (open) => {
    if (open) {
      query.value = "";
      cursor.value = 0;
    }
  },
);

watch(hits, () => {
  cursor.value = 0;
});

function choose(index = cursor.value) {
  const hit = hits.value[index];
  if (!hit) return;
  emit("jump", { conversationId: hit.conversationId, messageId: hit.messageId });
}

function onKey(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    cursor.value = (cursor.value + 1) % Math.max(hits.value.length, 1);
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    cursor.value = (cursor.value - 1 + hits.value.length) % Math.max(hits.value.length, 1);
  }
  if (event.key === "Enter") {
    event.preventDefault();
    choose();
  }
}
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <div class="sheet">
      <input
        v-model="query"
        autofocus
        placeholder="Перейти в чат или найти сообщение"
        @keydown="onKey"
      />
      <button
        v-for="(hit, index) in hits"
        :key="hit.key"
        type="button"
        :class="{ active: index === cursor }"
        @click="choose(index)"
      >
        <small>{{ hit.kind === "chat" ? "Чат" : "Сообщение" }}</small>
        <strong>{{ hit.title }}</strong>
        <span>{{ hit.subtitle }}</span>
      </button>
      <p v-if="hits.length === 0">Ничего не найдено</p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: start center;
  padding-top: 12vh;
  background: rgba(4, 10, 16, 0.55);
}

.sheet {
  width: min(560px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 16px;
  background: #17212b;
  box-shadow: var(--shadow);
  animation: rise 0.16s ease;
}

input {
  border: 0;
  border-radius: 10px;
  padding: 12px 14px;
  background: #242f3d;
  color: var(--text);
  outline: none;
}

button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border: 0;
  border-radius: 10px;
  padding: 8px 10px;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

button.active,
button:hover {
  background: #242f3d;
}

small {
  color: var(--accent);
  font-size: 11px;
}

span,
p {
  color: var(--muted);
  font-size: 13px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
