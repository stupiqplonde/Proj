<script setup lang="ts">
import { ref, watch } from "vue";

import { open } from "@tauri-apps/plugin-dialog";

import { invoke } from "@tauri-apps/api/core";

import type { Message, MessageDelete, MessageEdit } from "../types/message.ts";

const props = defineProps<{
  editingMessage?: Message | null;
  deletingMessage?: Message | null;
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

function submitMessage() {
  const body = draft.value.trim();

  if (!body) return;

  if (props.editingMessage) {
    emit("saveEdit", {
      id: props.editingMessage.id,
      body,
    });
    draft.value = "";
    return;
  }

  emit("send", body);
  draft.value = "";
}

function cancelEdit() {
  draft.value = "";
  emit("cancelEdit");
}

function cancelDelete() {
  emit("cancelDelete");
}

function confirmDelete() {
  if (!props.deletingMessage) return;

  emit("deleteMessage", {
    id: props.deletingMessage.id,
  });
}

async function selectImage() {
  if (props.editingMessage) return;

  const file = await open({
    multiple: false,

    filters: [
      {
        name: "Image",
        extensions: ["png", "jpg", "jpeg", "webp", "gif"],
      },
    ],
  });

  if (!file) {
    return;
  }

  const savedPath = await invoke<string>("save_attachment", {
    source: file,
  });

  emit("sendImage", savedPath);
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
          @click="selectImage"
      >
        📎
      </button>
      <input
          v-model="draft"
          type="text"
          :placeholder="editingMessage ? 'Измените сообщение' : 'Ну пиши уже че нить'"
          autocomplete="off"
      />
      <button type="submit">
        {{ editingMessage ? "Сохранить" : "Отправить" }}
      </button>
    </form>

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
              @click="cancelDelete"
          >
            Отмена
          </button>
          <button
              type="button"
              class="confirm-delete"
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
  border-top: 1px solid #252830;
  background: #17191f;
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
  border-left: 3px solid #4f7fea;
  padding-left: 10px;
}

.edit-bar-text strong {
  font-size: 12px;
  color: #4f7fea;
}

.edit-bar-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #858c98;
  font-size: 12px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
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
  background: #252830;
}

.confirm-dialog strong {
  font-size: 15px;
  color: #f2f3f5;
}

.confirm-dialog p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #858c98;
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
  color: #f2f3f5;
  background: #1c1f26;
}

.confirm-cancel:hover {
  background: #343842;
}

.confirm-delete {
  color: white;
  background: #3c0a0a;
}

.confirm-delete:hover {
  background: #3c0a0a;
}

.cancel-button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  color: #b5bbc7;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
}

.cancel-button:hover {
  background: #252830;
}

.image-button {
  width: 42px;
  height: 42px;
  border: 1px solid #343842;
  border-radius: 8px;
  background: #20232a;
  cursor: pointer;
  font-size: 18px;
}

.image-button:hover {
  background: #292c34;
}

.composer {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
}

.composer input {
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid #343842;
  border-radius: 7px;
  outline: none;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}

.composer input:focus {
  border-color: #4f7fea;
}

.composer button[type="submit"] {
  padding: 0 18px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: #386be0;
  font: inherit;
  font-weight: 600;
}
</style>
