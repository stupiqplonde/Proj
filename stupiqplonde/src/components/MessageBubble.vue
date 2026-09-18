<script setup lang="ts">
import { computed } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";

import { QUICK_REACTIONS } from "../data/emojis.ts";
import type { Message } from "../types/messages.ts";
import {
  groupReactions,
  type Reaction,
} from "../types/reactions.ts";
import {
  getImagePath,
  isImageMessage,
} from "../utils/imageMessage.ts";

const props = defineProps<{
  message: Message;
  avatar: string;
  isOwn: boolean;
  reactions: Reaction[];
  currentUserName: string;
  reactionPickerOpen: boolean;
}>();

const emit = defineEmits<{
  toggleReaction: [emoji: string];
  requestReaction: [];
}>();

const reactionGroups = computed(() =>
  groupReactions(props.reactions, props.currentUserName),
);

const imageSrc = computed(() => {
  if (!isImageMessage(props.message.body)) return null;
  return convertFileSrc(getImagePath(props.message.body));
});

const avatarSrc = computed(() =>
  props.avatar ? convertFileSrc(props.avatar) : "",
);

function formatTime(value: string) {
  const withTimezone = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(withTimezone);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reactionTitle(group: { authors: string[]; reactedByMe: boolean }) {
  const names = group.authors.join(", ");
  const action = group.reactedByMe ? "Убрать реакцию" : "Поставить такую же";
  return names ? `${names}. ${action}` : action;
}
</script>

<template>
  <div
    class="message-block"
    :class="{
      'message-block--own': isOwn,
      'message-block--picker-open': reactionPickerOpen,
      'message-block--image': !!imageSrc,
    }"
  >
    <div class="quick-reactions">
      <button
        v-for="emoji in QUICK_REACTIONS"
        :key="emoji"
        type="button"
        class="quick-reactions__btn"
        :title="`Реакция ${emoji}`"
        @click="emit('toggleReaction', emoji)"
      >
        {{ emoji }}
      </button>
      <button
        type="button"
        class="quick-reactions__btn"
        :class="{ 'quick-reactions__btn--open': reactionPickerOpen }"
        title="Другая реакция"
        @click="emit('requestReaction')"
      >
        +
      </button>
    </div>

    <div class="message-row">
      <span class="avatar">
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          alt=""
        />
        <span v-else>{{ message.author[0] }}</span>
      </span>
    <article
      class="message"
      :class="{
        'message--own': isOwn,
        'message--other': !isOwn,
        'message--image': !!imageSrc,
      }"
    >
      <img
        v-if="imageSrc"
        class="message__image"
        :src="imageSrc"
        alt="Изображение"
      />
      <p v-else>
        {{ message.body }}
      </p>
      <footer>
        <span>{{ message.author }}</span>
        <span>|</span>
        <span>{{ formatTime(message.created_at) }}</span>
      </footer>
    </article>
    </div>

    <div
      v-if="reactionGroups.length"
      class="reactions"
    >
      <button
        v-for="group in reactionGroups"
        :key="group.emoji"
        type="button"
        class="reaction"
        :class="{ 'reaction--mine': group.reactedByMe }"
        :title="reactionTitle(group)"
        @click="emit('toggleReaction', group.emoji)"
      >
        <span>{{ group.emoji }}</span>
        <span>{{ group.count }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.message-block {
  position: relative;
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: flex-start;
}

.message-block--own {
  align-self: flex-end;
  align-items: flex-end;
}

.message-block--image {
  width: fit-content;
  max-width: min(320px, 70%);
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.message-block--own .message-row {
  flex-direction: row-reverse;
}

.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  background: #343842;
  color: #f2f3f5;
  font-size: 13px;
  font-weight: 600;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quick-reactions {
  position: absolute;
  top: -14px;
  right: 8px;
  z-index: 1;
  display: none;
  gap: 2px;
  padding: 2px;
  border: 1px solid #343842;
  border-radius: 999px;
  background: #20232a;
}

.message-block--own .quick-reactions {
  right: auto;
  left: 8px;
}

.message-block:hover .quick-reactions,
.message-block--picker-open .quick-reactions {
  display: flex;
}

.quick-reactions__btn {
  width: 28px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  color: inherit;
  background: transparent;
  font: inherit;
  font-size: 14px;
}

.quick-reactions__btn:hover,
.quick-reactions__btn--open {
  background: #2a3a63;
}

.message {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
}

.message--own {
  background: #386be0;
}

.message--other {
  background: #252830;
}

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message--image {
  width: fit-content;
  max-width: 100%;
  padding: 6px;
}

.message__image {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 360px;
  object-fit: cover;
  border-radius: 8px;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #b5bbc7;
  font-size: 10px;
}

.reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.reaction {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid #343842;
  border-radius: 999px;
  cursor: pointer;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
  font-size: 12px;
}

.reaction--mine {
  border-color: #386be0;
  background: #2a3a63;
}
</style>
