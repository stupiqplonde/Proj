<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import type { Chat } from "../types/chats";
import type { Message } from "../types/message";

const props = defineProps<{
  message: Message;
  chats: Chat[];
  busy: boolean;
  error: string;
}>();
const emit = defineEmits<{
  confirm: [chatId: number];
  close: [];
}>();
const selectedChatId = ref<number | null>(null);
const dialog = useTemplateRef<HTMLDivElement>("dialog");
let previousFocus: HTMLElement | null = null;

function close() {
  if (!props.busy) emit("close");
}

function confirm() {
  if (props.busy || selectedChatId.value === null) return;
  emit("confirm", selectedChatId.value);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
  if (event.key !== "Tab") return;
  const controls = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), [tabindex='0']",
    ) ?? [],
  );
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.value?.focus();
  } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value?.focus();
});
onBeforeUnmount(() => previousFocus?.focus());
</script>

<template>
  <div class="forward-backdrop" @click.self="close">
    <div
      ref="dialog"
      class="forward-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forward-title"
      :aria-busy="busy"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <h2 id="forward-title">Переслать сообщение</h2>
      <p class="forward-preview">
        <strong>От {{ message.forwarded_author_name ?? message.author_name }}</strong>
        <span>{{ message.type === "image" ? "Изображение" : message.body }}</span>
      </p>
      <fieldset :disabled="busy" class="forward-chats">
        <legend>Выберите чат</legend>
        <label v-for="chat in chats" :key="chat.id" class="forward-chat">
          <input v-model="selectedChatId" type="radio" name="forward-chat" :value="chat.id" />
          <span>{{ chat.title }}</span>
        </label>
        <p v-if="chats.length === 0">Нет доступных чатов.</p>
      </fieldset>
      <p v-if="error" role="alert" class="forward-error">{{ error }}</p>
      <div class="forward-actions">
        <button type="button" :disabled="busy" @click="close">Отмена</button>
        <button type="button" :disabled="busy || selectedChatId === null" @click="confirm">
          {{ busy ? "Пересылаю…" : "Переслать" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forward-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #000a;
  display: grid;
  place-items: center;
  padding: 20px;
}
.forward-dialog {
  width: min(440px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #363c48;
  border-radius: 16px;
  background: #191c23;
  color: #f2f3f5;
}
h2 { margin: 0 0 16px; font-size: 20px; }
.forward-preview { display: grid; gap: 6px; overflow-wrap: anywhere; }
.forward-preview span {
  color: #b8bfcb;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.forward-chats { border: 0; padding: 0; margin: 20px 0; }
legend { margin-bottom: 10px; }
.forward-chat {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
}
.forward-chat:hover { background: #292e39; }
.forward-chat span { overflow-wrap: anywhere; min-width: 0; }
.forward-actions { display: flex; justify-content: flex-end; gap: 12px; }
button {
  padding: 10px 16px;
  border: 1px solid #4b5363;
  border-radius: 8px;
  color: inherit;
  background: #292e39;
  font: inherit;
  cursor: pointer;
}
button:last-child { background: #315bd5; }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 2px solid #8bb8ff; outline-offset: 3px; }
.forward-error { color: #ffb1b1; }
</style>