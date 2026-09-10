<script setup lang="ts">
import { computed, ref } from "vue";
import type { MessageView } from "../types/messages";
import { formatClock } from "../lib/time";
import { splitLinks } from "../lib/text";

const props = defineProps<{
  message: MessageView;
  isOwn: boolean;
  showAuthor: boolean;
  showAvatar: boolean;
  highlighted: boolean;
  selected: boolean;
  selectMode: boolean;
  color: string;
}>();

const emit = defineEmits<{
  reply: [];
  edit: [];
  remove: [];
  copy: [];
  forward: [];
  pin: [];
  react: [emoji: string];
  "open-reply": [id: number];
  toggle-select: [];
}>();

const menuOpen = ref(false);
const quick = ["❤️", "👍", "🔥", "😂", "😮", "😢"];
const time = computed(() => formatClock(props.message.created_at));
const parts = computed(() => splitLinks(props.message.body));

function onContext(event: MouseEvent) {
  event.preventDefault();
  menuOpen.value = true;
}
</script>

<template>
  <article
    :id="`msg-${message.id}`"
    class="row"
    :class="{
      'row--own': isOwn,
      'row--hl': highlighted,
      'row--selected': selected,
      'row--tight': !showAvatar,
    }"
    @contextmenu="onContext"
    @dblclick="!message.deleted && emit('reply')"
  >
    <button
      v-if="selectMode"
      class="check"
      type="button"
      @click="emit('toggle-select')"
    >
      {{ selected ? "●" : "○" }}
    </button>

    <span
      v-if="!isOwn"
      class="avatar side"
      :class="{ invisible: !showAvatar }"
      :style="{ background: color, width: '36px', height: '36px', fontSize: '13px' }"
    >
      {{ message.author[0] }}
    </span>

    <div class="bubble" :class="{ 'bubble--own': isOwn }">
      <button v-if="message.forwarded_from && !message.deleted" class="fwd" type="button">
        Переслано от {{ message.forwarded_from }}
      </button>
      <button
        v-if="message.reply && !message.deleted"
        class="quote"
        type="button"
        @click="emit('open-reply', message.reply.id)"
      >
        <strong>{{ message.reply.author }}</strong>
        <span>{{ message.reply.deleted ? "Сообщение удалено" : message.reply.body }}</span>
      </button>
      <p v-if="showAuthor && !isOwn" class="author">{{ message.author }}</p>
      <img
        v-if="message.attachment?.kind === 'image' && !message.deleted"
        class="photo"
        :src="message.attachment.data"
        :alt="message.attachment.name"
      />
      <a
        v-else-if="message.attachment?.kind === 'file' && !message.deleted"
        class="file"
        :href="message.attachment.data"
        :download="message.attachment.name"
      >
        📎 {{ message.attachment.name }}
      </a>
      <p v-if="message.deleted" class="body deleted">Сообщение удалено</p>
      <p v-else-if="message.body" class="body">
        <template v-for="(part, index) in parts" :key="index">
          <a v-if="part.href" :href="part.href" target="_blank" rel="noreferrer">{{ part.text }}</a>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
      <footer>
        <span v-if="message.edited_at && !message.deleted">изм.</span>
        <span>{{ time }}</span>
        <span v-if="isOwn" class="ticks" :class="{ 'ticks--seen': message.seen }">✓✓</span>
      </footer>
      <div v-if="message.reactions.length" class="reactions">
        <button
          v-for="group in message.reactions"
          :key="group.emoji"
          type="button"
          :class="{ mine: group.mine }"
          :title="group.authors.join(', ')"
          @click="emit('react', group.emoji)"
        >
          {{ group.emoji }} {{ group.count }}
        </button>
      </div>
    </div>

    <div class="hover">
      <button v-for="emoji in quick" :key="emoji" type="button" @click="emit('react', emoji)">
        {{ emoji }}
      </button>
      <button type="button" title="Ответить" @click="emit('reply')">↩</button>
      <button type="button" title="Выбрать" @click="emit('toggle-select')">☐</button>
      <button type="button" title="Ещё" @click="menuOpen = !menuOpen">⋯</button>
    </div>

    <div v-if="menuOpen" class="menu" @mouseleave="menuOpen = false">
      <button type="button" @click="emit('reply'); menuOpen = false">Ответить</button>
      <button type="button" @click="emit('copy'); menuOpen = false">Копировать</button>
      <button type="button" @click="emit('forward'); menuOpen = false">Переслать</button>
      <button type="button" @click="emit('pin'); menuOpen = false">Закрепить</button>
      <button type="button" @click="emit('toggle-select'); menuOpen = false">Выбрать</button>
      <button v-if="isOwn && !message.deleted" type="button" @click="emit('edit'); menuOpen = false">
        Изменить
      </button>
      <button
        v-if="isOwn && !message.deleted"
        class="danger"
        type="button"
        @click="emit('remove'); menuOpen = false"
      >
        Удалить
      </button>
    </div>
  </article>
</template>

<style scoped>
.row {
  position: relative;
  display: flex;
  max-width: min(82%, 680px);
  align-self: flex-start;
  align-items: flex-end;
  gap: 8px;
  animation: rise 0.22s ease;
}

.row--own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.row--tight {
  margin-top: -4px;
}

.row--hl .bubble {
  box-shadow: 0 0 0 2px var(--accent);
}

.row--selected .bubble {
  outline: 2px solid rgba(42, 171, 238, 0.7);
}

.side {
  margin-bottom: 2px;
}

.invisible {
  visibility: hidden;
}

.check {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: var(--accent);
}

.bubble {
  position: relative;
  padding: 8px 10px 6px;
  border-radius: 16px 16px 16px 6px;
  background: var(--bubble-other);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
}

.bubble--own {
  background: var(--bubble-own);
  border-radius: 16px 16px 6px 16px;
}

.author {
  margin: 0 0 4px;
  color: #8ec8f5;
  font-size: 13px;
  font-weight: 600;
}

.body {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.body a {
  color: #9ad4ff;
}

.deleted {
  font-style: italic;
  color: #9aacbd;
}

.photo {
  display: block;
  max-width: min(320px, 70vw);
  max-height: 280px;
  border-radius: 12px;
  margin-bottom: 6px;
  object-fit: cover;
}

.file {
  display: inline-block;
  margin-bottom: 6px;
  color: inherit;
}

.quote,
.fwd {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  margin-bottom: 6px;
  padding: 6px 8px;
  border: 0;
  border-left: 3px solid #6ab2f2;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.16);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.fwd {
  border-left-color: #e3a84c;
  font-size: 12px;
  color: #e3c27a;
}

.quote span {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 4px;
  color: #b7c6d4;
  font-size: 11px;
}

.ticks {
  letter-spacing: -2px;
  color: #8aa0b3;
}

.ticks--seen {
  color: #6cd3ff;
}

.reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.reactions button {
  border: 0;
  border-radius: 12px;
  padding: 2px 7px;
  background: rgba(0, 0, 0, 0.22);
  cursor: pointer;
  animation: pop 0.16s ease;
}

.reactions .mine {
  outline: 1px solid var(--accent);
}

.hover {
  display: none;
  align-self: center;
  margin: 0 6px;
  padding: 4px;
  border-radius: 14px;
  background: #1b2733;
  box-shadow: var(--shadow);
}

.row:hover .hover {
  display: flex;
}

.hover button {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 2px 4px;
}

.menu {
  position: absolute;
  top: 100%;
  z-index: 6;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 6px;
  border-radius: 12px;
  background: #1b2733;
  box-shadow: var(--shadow);
  animation: rise 0.14s ease;
}

.row--own .menu {
  right: 0;
}

.menu button {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.menu button:hover {
  background: var(--bg-hover);
}

.danger {
  color: var(--danger);
}
</style>
