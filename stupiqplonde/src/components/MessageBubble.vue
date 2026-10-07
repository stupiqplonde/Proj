<script setup lang="ts">
import { getFileUrl } from "../types/file.ts";

import type { Message } from "../types/message.ts";

import { ref } from "vue";

const emit = defineEmits<{
  edit: [message: Message];
  copy: [message: Message];
  forward: [message: Message];
  delete: [message: Message];
}>();

const props = defineProps<{
  message: Message;
  isOwn: boolean;
}>();

const isImgOpen = ref(false);
const isMenuOpen = ref(false);

const openModalImg = () => {
  isImgOpen.value = true;
};
const closeModalImg = () => {
  isImgOpen.value = false;
};

const openMenu = () => {
  isMenuOpen.value = true;
};
const closeMenu = () => {
  isMenuOpen.value = false;
};

function onEdit() {
  closeMenu();
  emit("edit", props.message);
}

function onCopy() {
  closeMenu();
  emit("copy", props.message);
}

function onForward() {
  closeMenu();
  emit("forward", props.message);
}

function onDelete(){
  closeMenu();
  emit("delete", props.message);
}
</script>

<template>
  <article
      class="message"
      :class="{
        'message--own': isOwn,
        'message--other': !isOwn,
      }"
  >
    <p v-if="message.forwarded_author_name !== null" class="forwarded-label">
      Переслано от {{ message.forwarded_author_name }}
    </p>
    <p v-if="message.type === 'text'">
      {{ message.body }}
    </p>

    <img
        v-if="message.type === 'image' && message.attachment"
        class="message-image"
        :src="getFileUrl(message.attachment)"
        @click="openModalImg"
        alt="Превью"
    />

    <div
        v-if="isImgOpen && message.attachment"
        class="modal-overlay"
        @click.self="closeModalImg"
    >
      <div class="modal-content">
        <img
            class="modal-image"
            :src="getFileUrl(message.attachment)"
            alt="Увеличенное изображение"
        />
      </div>
    </div>

    <footer @click="openMenu">
      <span v-if="message.edited_at" class="edited">изменено</span>
      <span>{{ message.author_name }}</span>
      <span>|</span>
      <span>{{ message.created_at }}</span>
    </footer>

    <div
        v-if="isMenuOpen"
        class="modal-overlay"
        @click.self="closeMenu"
    >
      <div class="menu-content">
        <button type="button" disabled>
          ответить
        </button>
        <button type="button" @click="onCopy">
          копировать
        </button>
        <button type="button" @click="onForward">
          переслать
        </button>
        <button
            v-if="isOwn && message.type === 'text'"
            type="button"
            @click="onEdit"
        >
          редактировать
        </button>
        <button
            v-if="isOwn"
            type="button"
            @click="onDelete"
        >
          удалить
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.forwarded-label {
  border-left: 2px solid #88b5ff;
  padding-left: 8px;
  color: #bbd4ff;
  font-size: 12px;
  overflow-wrap: anywhere;
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

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.menu-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
  padding: 12px;
  border-radius: 12px;
  background: #252830;
}

.menu-content button {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  text-align: left;
  color: #f2f3f5;
  background: #1c1f26;
  font: inherit;
  cursor: pointer;
}

.menu-content button:hover:not(:disabled) {
  background: #343842;
}

.menu-content button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.modal-image {
  display: block;
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 12px;
  object-fit: cover;
  cursor: pointer;
}

.message {
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
}
.message--own {
  align-self: flex-end;
  background: #386be0;
}
.message--other {
  align-self: flex-start;
  background: #252830;
}

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #b5bbc7;
  font-size: 10px;
  cursor: pointer;
}

.message p.forwarded-label {
  margin-bottom: 8px;
}

.edited {
  font-style: italic;
}
</style>
