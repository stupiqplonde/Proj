<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import EmojiPanel from "./EmojiPanel.vue";
import type { Attachment, Message } from "../types/messages";

const props = defineProps<{
  replyTo: Message | null;
  editing: Message | null;
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  send: [payload: { body: string; attachment: Attachment | null }];
  save: [body: string];
  cancel: [];
}>();

const emojiOpen = ref(false);
const attachment = ref<Attachment | null>(null);
const field = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.editing?.id,
  async (id) => {
    if (id && props.editing) {
      emit("update:modelValue", props.editing.body);
      await nextTick();
      field.value?.focus();
    }
  },
);

watch(
  () => props.replyTo?.id,
  async () => {
    await nextTick();
    field.value?.focus();
  },
);

function resize() {
  const el = field.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

function submit() {
  const body = props.modelValue.trim();
  if (!body && !attachment.value) return;
  if (props.editing) emit("save", body);
  else emit("send", { body, attachment: attachment.value });
  emit("update:modelValue", "");
  attachment.value = null;
  emojiOpen.value = false;
  nextTick(() => {
    if (field.value) field.value.style.height = "auto";
  });
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submit();
  }
  if (event.key === "Escape") emit("cancel");
}

function addEmoji(emoji: string) {
  emit("update:modelValue", `${props.modelValue}${emoji}`);
  field.value?.focus();
}

function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    attachment.value = {
      kind: file.type.startsWith("image/") ? "image" : "file",
      name: file.name,
      data: String(reader.result ?? ""),
    };
  };
  reader.readAsDataURL(file);
  (event.target as HTMLInputElement).value = "";
}
</script>

<template>
  <div class="wrap">
    <div v-if="replyTo || editing" class="banner">
      <div>
        <strong>{{ editing ? "Редактирование" : "Ответ" }}</strong>
        <p>{{ (editing ?? replyTo)?.body }}</p>
      </div>
      <button type="button" @click="emit('cancel')">✕</button>
    </div>

    <div v-if="attachment" class="attach-preview">
      <img v-if="attachment.kind === 'image'" :src="attachment.data" :alt="attachment.name" />
      <span v-else>📎 {{ attachment.name }}</span>
      <button type="button" @click="attachment = null">✕</button>
    </div>

    <form class="composer" @submit.prevent="submit">
      <div class="emoji-slot">
        <button type="button" class="icon" title="Эмодзи" @click="emojiOpen = !emojiOpen">☺</button>
        <EmojiPanel v-if="emojiOpen" class="emoji-pop" @pick="addEmoji" />
      </div>
      <button type="button" class="icon" title="Вложение" @click="fileInput?.click()">📎</button>
      <input ref="fileInput" class="hidden" type="file" @change="onFile" />
      <textarea
        ref="field"
        :value="modelValue"
        rows="1"
        placeholder="Написать сообщение..."
        @input="
          emit('update:modelValue', ($event.target as HTMLTextAreaElement).value);
          resize();
        "
        @keydown="onKey"
      />
      <button class="send" type="submit" :title="editing ? 'Сохранить' : 'Отправить'">
        <span v-if="editing">OK</span>
        <svg v-else viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M3.4 20.6 21 12 3.4 3.4l.1 7.2L15 12 3.5 13.4z" />
        </svg>
      </button>
    </form>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  padding: 8px 16px 16px;
  background: linear-gradient(180deg, transparent, rgba(14, 22, 33, 0.9) 24%);
}

.banner,
.attach-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 52px 8px;
  padding: 8px 12px;
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  background: #182533;
  animation: rise 0.16s ease;
}

.banner p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60vw;
}

.attach-preview img {
  height: 56px;
  border-radius: 8px;
}

.banner button,
.attach-preview button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.composer {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 8px;
  border-radius: 22px;
  background: var(--bg-composer);
  box-shadow: var(--shadow);
}

textarea {
  flex: 1;
  resize: none;
  border: 0;
  background: transparent;
  color: var(--text);
  outline: none;
  max-height: 160px;
  padding: 8px 4px;
  line-height: 1.4;
}

.icon,
.send {
  border: 0;
  cursor: pointer;
}

.icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  font-size: 18px;
}

.send {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--accent);
  color: #041018;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.hidden {
  display: none;
}

.emoji-slot {
  position: relative;
}

.emoji-pop {
  position: absolute;
  left: 0;
  bottom: 48px;
  width: 280px;
  z-index: 5;
}
</style>
