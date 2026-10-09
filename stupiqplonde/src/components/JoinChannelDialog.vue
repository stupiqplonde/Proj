<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { normalizeInviteCode } from "../services/inviteCode";

const props = defineProps<{
  busy: boolean;
  error: string;
}>();
const emit = defineEmits<{
  join: [code: string];
  close: [];
}>();

const code = ref("");
const dialog = useTemplateRef<HTMLFormElement>("dialog");
let previousFocus: HTMLElement | null = null;

const canSubmit = computed(
  () => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(normalizeInviteCode(code.value)) && !props.busy,
);

function close() {
  if (!props.busy) emit("close");
}

function submit() {
  const clean = normalizeInviteCode(code.value);
  if (!canSubmit.value) return;
  emit("join", clean);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
  if (event.key !== "Tab") return;
  const controls = Array.from(dialog.value?.querySelectorAll<HTMLElement>(
    "button:not(:disabled), input:not(:disabled)",
  ) ?? []);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.value?.focus();
  } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value?.querySelector<HTMLInputElement>("input")?.focus();
});
onBeforeUnmount(() => previousFocus?.focus());
</script>

<template>
  <div class="join-backdrop" @click.self="close">
    <form
      ref="dialog"
      class="join-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-channel-title"
      :aria-busy="busy"
      tabindex="-1"
      @keydown="onKeydown"
      @submit.prevent="submit"
    >
      <h2 id="join-channel-title">Вступить в канал</h2>
      <p class="join-hint">Введите код приглашения, который дал автор канала.</p>
      <label class="join-field">
        Код приглашения
        <input
          v-model="code"
          type="text"
          name="code"
          maxlength="16"
          minlength="8"
          autocomplete="off"
          spellcheck="false"
          placeholder="Например ABCD2345"
          :disabled="busy"
          required
        />
      </label>
      <p v-if="error" role="alert" class="join-error">{{ error }}</p>
      <div class="join-actions">
        <button type="button" :disabled="busy" @click="close">Отмена</button>
        <button type="submit" :disabled="!canSubmit">
          {{ busy ? "Вступаю…" : "Вступить" }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.join-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(29, 35, 48, .38);
  display: grid;
  place-items: center;
  padding: 20px;
}
.join-dialog {
  width: min(400px, 100%);
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
}
h2 { margin: 0 0 10px; font-size: 20px; }
.join-hint {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.join-field {
  display: grid;
  gap: 6px;
  margin-bottom: 18px;
  font-size: 13px;
  color: var(--text);
}
.join-field input {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--background);
  color: inherit;
  font: inherit;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.join-actions { display: flex; justify-content: flex-end; gap: 12px; }
button {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: inherit;
  background: var(--background);
  font: inherit;
  cursor: pointer;
}
button[type="submit"] { background: var(--accent); }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 2px solid #8bb8ff; outline-offset: 3px; }
.join-error { color: var(--danger); margin: 0 0 12px; }
</style>
