<script setup lang="ts">
import { ref, watch } from "vue";

import { open } from "@tauri-apps/plugin-dialog";

import { invoke } from "@tauri-apps/api/core";

import type { Message, MessageEdit } from "../types/message.ts";

const props = defineProps<{
  editingMessage?: Message | null;
}>();

const emit = defineEmits<{
  send: [body: string];
  sendImage: [path: string];
  saveEdit: [edit: MessageEdit];
  cancelEdit: [];
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
