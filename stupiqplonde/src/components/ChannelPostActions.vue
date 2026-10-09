<script setup lang="ts">
import { ref } from "vue";
import type { ChannelPost } from "../types/message";
import { REACTION_EMOJIS } from "../services/channels";

const props = defineProps<{
  post: ChannelPost;
  addComment: (messageId: number, body: string) => Promise<void>;
  toggleReaction: (messageId: number, emoji: string) => Promise<void>;
}>();
const draft = ref("");
const busy = ref(false);
const error = ref("");
const commentsOpen = ref(false);

async function react(emoji: string) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try { await props.toggleReaction(props.post.id, emoji); }
  catch { error.value = "Не удалось сохранить реакцию. Повторите попытку."; }
  finally { busy.value = false; }
}

async function comment() {
  if (busy.value || !draft.value.trim()) return;
  busy.value = true;
  error.value = "";
  try {
    await props.addComment(props.post.id, draft.value);
    draft.value = "";
  } catch { error.value = "Не удалось сохранить комментарий. Повторите попытку."; }
  finally { busy.value = false; }
}
</script>

<template>
  <div class="post-actions">
    <div class="reactions" aria-label="Реакции на пост">
      <button v-for="emoji in REACTION_EMOJIS" :key="emoji" type="button"
        :disabled="busy" :aria-label="`Реакция ${emoji}`"
        :aria-pressed="Boolean(post.reactions.find(r => r.emoji === emoji)?.reacted_by_me)"
        @click="react(emoji)">
        {{ emoji }} {{ post.reactions.find(r => r.emoji === emoji)?.count || '' }}
      </button>
      <button type="button" :aria-expanded="commentsOpen" @click="commentsOpen = !commentsOpen">
        Комментарии · {{ post.comments.length }}
      </button>
    </div>
    <div v-if="commentsOpen" class="comments">
      <p v-if="!post.comments.length" class="muted">Пока нет комментариев</p>
      <div v-for="item in post.comments" :key="item.id" class="comment">
        <strong>{{ item.author_name }}</strong> <time>{{ item.created_at }}</time>
        <p>{{ item.body }}</p>
      </div>
      <form @submit.prevent="comment">
        <input v-model="draft" aria-label="Комментарий к посту" placeholder="Написать комментарий"
          maxlength="2000" :disabled="busy" required />
        <button type="submit" :disabled="busy || !draft.trim()">Отправить</button>
      </form>
    </div>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.post-actions { width: 100%; padding: 4px 14px 14px 53px; }
.reactions { display: flex; flex-wrap: wrap; gap: 6px; }
button, input { border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px; background: var(--background); color: var(--text); font: inherit; font-size: 13px; }
button { cursor: pointer; }
button[aria-pressed="true"] { background: var(--accent-soft); border-color: #c6ddff; color: var(--accent); }
button:disabled { opacity: .5; cursor: not-allowed; }
.comments { margin-top: 10px; padding: 12px; background: var(--surface); border-radius: 10px; }
.comment { padding: 8px 0; border-bottom: 1px solid var(--border); }
.comment strong { font-size: 13px; }
.comment time, .muted { color: var(--muted); font-size: 12px; }
.comment p { margin: 6px 0; overflow-wrap: anywhere; white-space: pre-wrap; }
form { display: flex; gap: 8px; margin-top: 12px; }
input { flex: 1; min-width: 0; }
.error { color: var(--danger); font-size: 13px; }
button:focus-visible, input:focus-visible { outline: 2px solid #8bb8ff; outline-offset: 2px; }
</style>
