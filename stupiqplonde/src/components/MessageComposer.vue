<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";

import {
  open
} from "@tauri-apps/plugin-dialog";

import { invoke } from "@tauri-apps/api/core";

import {fileImage} from "../utils/imageMessage.ts";

const props = defineProps<{
  insertEmoji?: string | null;
  emojiOpen?: boolean;
}>();

const emit = defineEmits<{
  send: [body: string];
  requestEmoji: [];
  emojiInserted: [];
}>();

const draft = ref("");
const inputEl = useTemplateRef<HTMLInputElement>("composer-input");
const caret = ref(0);

function rememberCaret() {
  const input = inputEl.value;
  if (!input) return;
  caret.value = input.selectionStart ?? draft.value.length;
}

watch(
  () => props.insertEmoji,
  async (emoji) => {
    if (!emoji) return;

    const start = caret.value;
    const current = draft.value;
    draft.value = current.slice(0, start) + emoji + current.slice(start);
    caret.value = start + emoji.length;
    emit("emojiInserted");

    await nextTick();
    const input = inputEl.value;
    if (!input) return;
    input.focus();
    input.setSelectionRange(caret.value, caret.value);
  },
);

async function pickFile() {
  rememberCaret();

  // open - Открывает системный выбор файла
  const file = await open({
    multiple:false, // Запрещает выбрать несколько файлов

    filters:[
      {
        name:"Images",

        extensions:[
          "png",
          "jpg",
          "jpeg",
          "webp",
          "gif"
        ]
      }
    ]
  });

  if(!file){
    return
  }

  const savedPath =
      await invoke<string>(
          "save_attachment",
          {
            source: file
          }
      );

  console.log(savedPath)

  if (!file || Array.isArray(file)) return;

  const lower = file.toLowerCase();
  const allowed = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  if (!allowed.some((ext) => lower.endsWith(ext))) return;

  emit("send", `${fileImage}${file}`);
}

function submitMessage() {
  const body = draft.value.trim();

  if (!body) return;

  emit("send", body);
  draft.value = "";
  caret.value = 0;
}
</script>

<template>
  <form
    class="composer"
    @submit.prevent="submitMessage"
  >
    <button
      type="button"
      class="composer__file"
      title="Прикрепить изображение или GIF"
      @click="pickFile"
    >
      Файл
    </button>
    <input
      ref="composer-input"
      v-model="draft"
      type="text"
      placeholder="Напишите что-то"
      autocomplete="off"
      @click="rememberCaret"
      @keyup="rememberCaret"
      @input="rememberCaret"
      @select="rememberCaret"
    />
    <button
      type="button"
      class="composer__emoji"
      :class="{ 'composer__emoji--open': emojiOpen }"
      title="Вставить эмодзи"
      @click="emit('requestEmoji')"
    >
      Эмодзи
    </button>
    <button type="submit">Отправить</button>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  bottom: 0;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
  flex-shrink: 0;
}

.composer input {
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid #343842;
  border-radius: 7px;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}

.composer input:focus {
  outline: none;
  border-color: #4f7fa4;
}

.composer button {
  padding: 0 18px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: #434365;
  font: inherit;
  font-weight: 600;
}

.composer__file {
  flex-shrink: 0;
  background: #2f3645;
  transition: background 0.15s ease, transform 0.1s ease;
}

.composer__file:hover {
  background: #3a4356;
}

.composer__file:active {
  transform: scale(0.97);
}

.composer__emoji--open {
  background: #386be0;
}
</style>



////////////////////////



<!--<script setup lang="ts">-->
<!--import { nextTick, ref, useTemplateRef, watch } from "vue";-->

<!--const props = defineProps<{-->
<!--  insertEmoji?: string | null;-->
<!--  emojiOpen?: boolean;-->
<!--}>();-->

<!--const emit = defineEmits<{-->
<!--  send: [body: string];-->
<!--  requestEmoji: [];-->
<!--  emojiInserted: [];-->
<!--}>();-->

<!--const draft = ref("");-->
<!--const inputEl = useTemplateRef<HTMLInputElement>("composer-input");-->
<!--const caret = ref(0);-->

<!--function rememberCaret() {-->
<!--  const input = inputEl.value;-->
<!--  if (!input) return;-->
<!--  caret.value = input.selectionStart ?? draft.value.length;-->
<!--}-->

<!--watch(-->
<!--    () => props.insertEmoji,-->
<!--    async (emoji) => {-->
<!--      if (!emoji) return;-->

<!--      const start = caret.value;-->
<!--      const current = draft.value;-->
<!--      draft.value = current.slice(0, start) + emoji + current.slice(start);-->
<!--      caret.value = start + emoji.length;-->
<!--      emit("emojiInserted");-->

<!--      await nextTick();-->
<!--      const input = inputEl.value;-->
<!--      if (!input) return;-->
<!--      input.focus();-->
<!--      input.setSelectionRange(caret.value, caret.value);-->
<!--    },-->
<!--);-->

<!--function submitMessage() {-->
<!--  const body = draft.value.trim();-->

<!--  if (!body) return;-->

<!--  emit("send", body);-->
<!--  draft.value = "";-->
<!--  caret.value = 0;-->
<!--}-->
<!--</script>-->

<!--<template>-->
<!--  <form-->
<!--      class="composer"-->
<!--      @submit.prevent="submitMessage"-->
<!--  >-->
<!--    <input-->
<!--        ref="composer-input"-->
<!--        v-model="draft"-->
<!--        type="text"-->
<!--        placeholder="Напишите что-то"-->
<!--        autocomplete="off"-->
<!--        @click="rememberCaret"-->
<!--        @keyup="rememberCaret"-->
<!--        @input="rememberCaret"-->
<!--        @select="rememberCaret"-->
<!--    />-->
<!--    <button-->
<!--        type="button"-->
<!--        class="composer__emoji"-->
<!--        :class="{ 'composer__emoji&#45;&#45;open': emojiOpen }"-->
<!--        title="Вставить эмодзи"-->
<!--        @click="emit('requestEmoji')"-->
<!--    >-->
<!--      Эмодзи-->
<!--    </button>-->
<!--    <button type="submit">Отправить</button>-->
<!--  </form>-->
<!--</template>-->

<!--<style scoped>-->
<!--.composer {-->
<!--  display: flex;-->
<!--  bottom: 0;-->
<!--  gap: 10px;-->
<!--  padding: 15px 20px;-->
<!--  border-top: 1px solid #252830;-->
<!--  background: #17191f;-->
<!--  flex-shrink: 0;-->
<!--}-->

<!--.composer input {-->
<!--  flex: 1;-->
<!--  min-width: 0;-->
<!--  padding: 11px 13px;-->
<!--  border: 1px solid #343842;-->
<!--  border-radius: 7px;-->
<!--  color: #f2f3f5;-->
<!--  background: #20232a;-->
<!--  font: inherit;-->
<!--}-->

<!--.composer input:focus {-->
<!--  outline: none;-->
<!--  border-color: #4f7fa4;-->
<!--}-->

<!--.composer button {-->
<!--  padding: 0 18px;-->
<!--  border: none;-->
<!--  border-radius: 7px;-->
<!--  cursor: pointer;-->
<!--  color: white;-->
<!--  background: #434365;-->
<!--  font: inherit;-->
<!--  font-weight: 600;-->
<!--}-->

<!--.composer__emoji&#45;&#45;open {-->
<!--  background: #386be0;-->
<!--}-->
<!--</style>-->
