<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

import { open } from "@tauri-apps/plugin-dialog";

import { invoke } from "@tauri-apps/api/core";

import type { Message, MessageDelete, MessageEdit } from "../types/message.ts";
import AppIcon from "./AppIcon.vue";

const props = defineProps<{
  editingMessage?: Message | null;
  deletingMessage?: Message | null;
  disabled: boolean;
  isChannel: boolean;
  error: string;
  submittedMessage: number;
}>();

const emit = defineEmits<{
  send: [body: string];
  sendImage: [path: string];
  saveEdit: [edit: MessageEdit];
  deleteMessage: [payload: MessageDelete];
  cancelEdit: [];
  cancelDelete: [];
}>();

const draft = ref("");
const imageError = ref("");
let mounted = true;
onBeforeUnmount(() => { mounted = false; });

watch(
  () => props.editingMessage,
  (message) => {
    if (message) {
      draft.value = message.body ?? "";
    } else {
      draft.value = "";
    }
  },
);

watch(
  () => props.submittedMessage,
  () => { draft.value = ""; },
);

function submitMessage() {
  if (props.disabled) return;
  const body = draft.value.trim();

  if (!body) return;

  if (props.editingMessage) {
    emit("saveEdit", {
      id: props.editingMessage.id,
      body,
    });
    return;
  }

  emit("send", body);
}

function cancelEdit() {
  if (props.disabled) return;
  draft.value = "";
  emit("cancelEdit");
}

function cancelDelete() {
  if (props.disabled) return;
  emit("cancelDelete");
}

function confirmDelete() {
  if (props.disabled) return;
  if (!props.deletingMessage) return;

  emit("deleteMessage", {
    id: props.deletingMessage.id,
  });
}

async function selectImage() {
  if (props.editingMessage || props.disabled) return;
  imageError.value = "";

  try {
    const file = await open({
      multiple: false,

      filters: [
        {
          name: "Image",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });

    if (!file || !mounted || props.disabled) {
      return;
    }

    const savedPath = await invoke<string>("save_attachment", {
      source: file,
    });

    if (mounted && !props.disabled) emit("sendImage", savedPath);
  } catch (error) {
    console.error(error);
    if (mounted) imageError.value = "Не удалось прикрепить изображение. Повторите попытку.";
  }
}
</script>

<template>
  <div class="composer-wrap">
    <div
        v-if="editingMessage"
        class="edit-bar"
    >
      <div class="edit-bar-text">
        <strong>Редактирование</strong>
        <span>{{ editingMessage.body }}</span>
      </div>
      <button
          type="button"
          class="cancel-button"
          :disabled="disabled"
          @click="cancelEdit"
      >
        ✕
      </button>
    </div>
    <form
        class="composer"
        @submit.prevent="submitMessage"
    >
      <button
          v-if="!editingMessage"
          type="button"
          class="image-button"
          aria-label="Прикрепить изображение"
          :disabled="disabled"
          @click="selectImage"
      >
        <AppIcon name="paperclip" :size="20" />
      </button>
      <input
          v-model="draft"
          type="text"
          :disabled="disabled"
          :placeholder="editingMessage ? 'Измените сообщение' : isChannel ? 'Написать публикацию…' : 'Написать сообщение…'"
          autocomplete="off"
      />
      <button type="submit" :disabled="disabled || !draft.trim()" :aria-label="editingMessage ? 'Сохранить' : isChannel ? 'Опубликовать' : 'Отправить'">
        <AppIcon :name="editingMessage ? 'check' : 'send'" :size="18" />
      </button>
    </form>

    <p v-if="error || imageError" class="composer-error" role="alert">{{ error || imageError }}</p>

    <div
        v-if="deletingMessage"
        class="modal-overlay"
        @click.self="cancelDelete"
    >
      <div class="confirm-dialog">
        <strong>Удалить сообщение?</strong>
        <p>{{ deletingMessage.body ?? "изображение" }}</p>
        <div class="confirm-actions">
          <button
              type="button"
              class="confirm-cancel"
              :disabled="disabled"
              @click="cancelDelete"
          >
            Отмена
          </button>
          <button
              type="button"
              class="confirm-delete"
              :disabled="disabled"
              @click="confirmDelete"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.composer-wrap {
  flex-shrink: 0;
  padding: 0 20px 18px;
  background: var(--surface);
}

.composer-error {
  margin: 0;
  padding: 0 20px 15px;
  color: var(--danger);
  font-size: 13px;
}

.edit-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px 0;
}

.edit-bar-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-left: 3px solid var(--accent);
  padding-left: 10px;
}

.edit-bar-text strong {
  font-size: 12px;
  color: var(--accent);
}

.edit-bar-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 12px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(29, 35, 48, .38);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 280px;
  max-width: 90vw;
  padding: 18px;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 20px 80px #17234526;
}

.confirm-dialog strong {
  font-size: 15px;
  color: var(--text);
}

.confirm-dialog p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 13px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.confirm-actions button {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.confirm-cancel {
  color: var(--text);
  background: var(--background);
}

.confirm-cancel:hover {
  background: var(--border);
}

.confirm-delete {
  color: white;
  background: var(--danger);
}

.confirm-delete:hover {
  background: var(--danger);
}

.cancel-button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  font-size: 16px;
}

.cancel-button:hover {
  background: var(--border);
}

.image-button {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: var(--background);
  color: var(--muted);
  cursor: pointer;
  font-size: 18px;
}

.image-button:hover {
  background: var(--border);
}

.composer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--background);
}
.composer:focus-within { border-color: #c2d9f7; box-shadow: 0 0 0 3px #007aff08; }

.composer input {
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 0;
  border-radius: 7px;
  outline: none;
  color: var(--text);
  background: var(--background);
  font: inherit;
  font-size: 12px;
}

.composer input:focus {
  border-color: var(--accent);
}

.composer button[type="submit"] {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  flex-shrink: 0;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: var(--accent);
  font: inherit;
  font-weight: 600;
}
</style>
