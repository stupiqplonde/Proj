<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import MessageBubble from "./MessageBubble.vue";
import type { MessageView } from "../types/messages";
import { dayKey, formatDayLabel } from "../lib/time";

const props = defineProps<{
  messages: MessageView[];
  currentUserName: string;
  highlightedId: number | null;
  pinned: MessageView | null;
  firstUnreadId: number | null;
  selectedIds: number[];
  selectMode: boolean;
  authorColors: Record<string, string>;
}>();

const emit = defineEmits<{
  reply: [message: MessageView];
  edit: [message: MessageView];
  remove: [message: MessageView];
  copy: [message: MessageView];
  forward: [message: MessageView];
  pin: [message: MessageView];
  react: [message: MessageView, emoji: string];
  "open-reply": [id: number];
  unpin: [];
  "toggle-select": [id: number];
}>();

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "unread"; key: string }
  | {
      kind: "msg";
      key: string;
      message: MessageView;
      showAuthor: boolean;
      showAvatar: boolean;
    };

const rows = computed<Row[]>(() => {
  const result: Row[] = [];
  let lastDay = "";
  let lastAuthor = "";
  const list = props.messages;
  for (let index = 0; index < list.length; index += 1) {
    const message = list[index];
    const day = dayKey(message.created_at);
    if (day !== lastDay) {
      result.push({ kind: "day", key: `day-${day}`, label: formatDayLabel(message.created_at) });
      lastDay = day;
      lastAuthor = "";
    }
    if (props.firstUnreadId && message.id === props.firstUnreadId) {
      result.push({ kind: "unread", key: "unread" });
    }
    const next = list[index + 1];
    const nextSame =
      next &&
      next.author === message.author &&
      dayKey(next.created_at) === day &&
      next.id !== props.firstUnreadId;
    result.push({
      kind: "msg",
      key: `msg-${message.id}`,
      message,
      showAuthor: message.author !== lastAuthor,
      showAvatar: !nextSame,
    });
    lastAuthor = message.author;
  }
  return result;
});

const bottomAnchor = useTemplateRef<HTMLDivElement>("bottom-anchor");
const scroller = useTemplateRef<HTMLDivElement>("scroller");
const away = ref(false);

async function scrollToBottom(smooth = true) {
  await nextTick();
  bottomAnchor.value?.scrollIntoView({
    behavior: smooth ? "smooth" : "auto",
    block: "end",
  });
  away.value = false;
}

function onScroll() {
  const el = scroller.value;
  if (!el) return;
  away.value = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
}

watch(
  () => props.messages.length,
  () => {
    if (!away.value) void scrollToBottom(true);
  },
);

watch(
  () => props.highlightedId,
  async (id) => {
    if (!id) return;
    await nextTick();
    document.getElementById(`msg-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  },
);

onMounted(() => scrollToBottom(false));

function jumpPinned() {
  if (props.pinned) emit("open-reply", props.pinned.id);
}

function colorFor(author: string) {
  return props.authorColors[author] ?? "#6ab2f2";
}
</script>

<template>
  <div class="pane">
    <button v-if="pinned && !pinned.deleted" class="pin" type="button" @click="jumpPinned">
      <div>
        <strong>Закреплено</strong>
        <span>{{ pinned.body || pinned.attachment?.name }}</span>
      </div>
      <span class="unpin" @click.stop="emit('unpin')">✕</span>
    </button>

    <div ref="scroller" class="messages" @scroll="onScroll">
      <div class="inner">
        <div v-if="messages.length === 0" class="empty">
          <strong>Нет сообщений</strong>
          <span>Напишите первым — как в Telegram</span>
        </div>

        <template v-for="row in rows" :key="row.key">
          <div v-if="row.kind === 'day'" class="day">
            <span>{{ row.label }}</span>
          </div>
          <div v-else-if="row.kind === 'unread'" class="unread-line">
            <span>Непрочитанные сообщения</span>
          </div>
          <MessageBubble
            v-else
            :message="row.message"
            :is-own="row.message.author === currentUserName"
            :show-author="row.showAuthor"
            :show-avatar="row.showAvatar"
            :highlighted="row.message.id === highlightedId"
            :selected="selectedIds.includes(row.message.id)"
            :select-mode="selectMode"
            :color="colorFor(row.message.author)"
            @reply="emit('reply', row.message)"
            @edit="emit('edit', row.message)"
            @remove="emit('remove', row.message)"
            @copy="emit('copy', row.message)"
            @forward="emit('forward', row.message)"
            @pin="emit('pin', row.message)"
            @react="(emoji) => emit('react', row.message, emoji)"
            @open-reply="emit('open-reply', $event)"
            @toggle-select="emit('toggle-select', row.message.id)"
          />
        </template>
        <div ref="bottom-anchor" class="anchor" aria-hidden="true" />
      </div>
    </div>

    <button v-if="away" class="jump" type="button" @click="scrollToBottom(true)">↓</button>
  </div>
</template>

<style scoped>
.pane {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.035) 1.2px, transparent 1.2px);
  background-size: 22px 22px;
}

.pin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 16px 0;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(23, 33, 43, 0.92);
  cursor: pointer;
  text-align: left;
  animation: rise 0.18s ease;
}

.pin span {
  display: block;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70vw;
}

.unpin {
  color: var(--muted);
  padding: 4px;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 16px 8px;
}

.inner {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
}

.empty {
  margin: auto;
  text-align: center;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day,
.unread-line {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}

.day span,
.unread-line span {
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(24, 37, 51, 0.9);
  color: #d5e0ea;
  font-size: 12px;
  font-weight: 600;
}

.unread-line span {
  background: rgba(42, 171, 238, 0.18);
  color: #9ad4ff;
}

.anchor {
  height: 1px;
}

.jump {
  position: absolute;
  right: 18px;
  bottom: 12px;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: #17212b;
  box-shadow: var(--shadow);
  cursor: pointer;
  animation: pop 0.16s ease;
}
</style>
