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
    <header class="message-header">
      <span class="message-avatar"><img v-if="message.author_avatar" :src="getFileUrl(message.author_avatar)" alt="" /><span v-else>{{ message.author_name.slice(0, 1).toUpperCase() }}</span></span>
      <strong>{{ message.author_name }}</strong>
      <time>{{ message.created_at }}</time>
      <span v-if="message.edited_at" class="edited">изменено</span>
      <button type="button" class="message-menu" aria-label="Действия с сообщением" @click="openMenu">···</button>
    </header>
    <div class="message-body">
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

    </div>

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
  color: var(--accent);
  font-size: 12px;
  overflow-wrap: anywhere;
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
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 15px 60px #17234526;
}

.menu-content button {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  text-align: left;
  color: var(--text);
  background: var(--surface);
  font: inherit;
  cursor: pointer;
}

.menu-content button:hover:not(:disabled) {
  background: var(--border);
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
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
}
.message--own {
  align-self: flex-start;
  background: #f8fbff;
}
.message--other {
  align-self: flex-start;
  background: transparent;
}
.message:hover { background: #f6f8fb; }
.message-header { display: flex; align-items: center; gap: 9px; margin-bottom: 3px; }
.message-avatar { width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; display: grid; place-items: center; overflow: hidden; background: var(--accent-soft); color: var(--accent); font-size: 12px; font-weight: 600; }
.message-avatar img { width: 100%; height: 100%; object-fit: cover; }
.message-header strong { font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
.message-header time, .edited { font-size: 9px; color: var(--muted); }
.message-menu { margin-left: auto; background: transparent; border: 0; padding: 0 6px; border-radius: 5px; font-size: 21px; color: var(--muted); line-height: 20px; }
.message-menu:hover { background: var(--border); }
.message-body { padding-left: 39px; font-size: 13px; }

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message p.forwarded-label {
  margin-bottom: 8px;
}

.edited {
  font-style: italic;
}
</style>
