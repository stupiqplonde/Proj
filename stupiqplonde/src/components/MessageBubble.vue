<script setup lang="ts">
import { getFileUrl } from "../types/file.ts";

import type {
  Message,
  MessageEdit,
} from "../types/message.ts";

import { ref } from "vue";

const emit = defineEmits<{
  save: [
      message: MessageEdit
  ];
}>();

defineProps<{
  message: Message;
  isOwn: boolean;
  close?: false;
  edit?: false;
}>();

// function submitMess(){
//   const cleanMess = message.body.value.trim();
//
//   if (!cleanMess){
//     return;
//   }
//
//   emit(
//       "save",
//       {
//         message: cleanMess,
//       },
//   );
// }

const isImgOpen = ref(false)

const isMessageEdit = ref(false)

const isEdit = ref(false)

const openModalImg = () => { isImgOpen.value = true }
const closeModalImg = () => { isImgOpen.value = false }

const openModalMesEdit = () => { isMessageEdit.value = true }
const closeModalMesEdit = () => { isMessageEdit.value = false }

const openEdit = () => { isEdit.value = true }
</script>

<template>
  <article
      class="message"
      :class="{
        'message--own': isOwn,
        'message--other': !isOwn,
      }"
  >
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
        v-if="isImgOpen"
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


    <footer
        @click="openModalMesEdit"
    >
      <span>{{ message.author_name }}</span>
      <span>|</span>
      <span>{{ message.created_at }}</span>
    </footer>

    <div
        v-if="isMessageEdit"
        class="modal-overlay"
        @click.self="closeModalMesEdit"
    >
    <div
        v-if="isEdit"
    >
      <input
          id="message_edit"
          v-model="message"
          type="text"
          maxlength="40"
      >
    </div>

      <div class="modal-content">
        <button>
          ответить
        </button>
        <button>
          копировать
        </button>
        <button
            v-if="isOwn"
            @click="openEdit"
        >
          редактировать
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>

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
}
</style>
