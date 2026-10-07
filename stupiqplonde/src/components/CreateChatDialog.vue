<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import type { CreateChat } from "../types/chats";
import type { User } from "../types/user";

const props = defineProps<{
  users: User[];
  busy: boolean;
  error: string;
}>();
const emit = defineEmits<{
  create: [chat: CreateChat];
  close: [];
}>();

const title = ref("");
const subtitle = ref("");
const selectedIds = ref<number[]>([]);
const dialog = useTemplateRef<HTMLDivElement>("dialog");
let previousFocus: HTMLElement | null = null;

const canSubmit = computed(
  () => title.value.trim().length > 0 && selectedIds.value.length > 0 && !props.busy,
);

function close() {
  if (!props.busy) emit("close");
}

function submit() {
  const cleanTitle = title.value.trim();
  if (!cleanTitle || selectedIds.value.length === 0 || props.busy) return;
  emit("create", {
    title: cleanTitle,
    subtitle: subtitle.value.trim(),
    memberIds: [...selectedIds.value],
  });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
  if (event.key !== "Tab") return;
  const controls = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex='0']",
    ) ?? [],
  );
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
  const firstInput = dialog.value?.querySelector<HTMLInputElement>("input");
  if (firstInput) firstInput.focus();
  else dialog.value?.focus();
});
onBeforeUnmount(() => previousFocus?.focus());
</script>

<template>
  <div class="create-backdrop" @click.self="close">
    <form
      ref="dialog"
      class="create-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-chat-title"
      :aria-busy="busy"
      tabindex="-1"
      @keydown="onKeydown"
      @submit.prevent="submit"
    >
      <h2 id="create-chat-title">Новый чат</h2>
      <label class="create-field">
        Название
        <input v-model="title" type="text" name="title" maxlength="80" :disabled="busy" required />
      </label>
      <label class="create-field">
        Подзаголовок
        <input v-model="subtitle" type="text" name="subtitle" maxlength="120" :disabled="busy" />
      </label>
      <fieldset :disabled="busy" class="create-members">
        <legend>Участники</legend>
        <label v-for="user in users" :key="user.id" class="create-member">
          <input v-model="selectedIds" type="checkbox" :value="user.id" />
          <span>{{ user.display_name }}</span>
        </label>
        <p v-if="users.length === 0">Нет других пользователей.</p>
      </fieldset>
      <p v-if="error" role="alert" class="create-error">{{ error }}</p>
      <div class="create-actions">
        <button type="button" :disabled="busy" @click="close">Отмена</button>
        <button type="submit" :disabled="!canSubmit">
          {{ busy ? "Создаю…" : "Создать" }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #000a;
  display: grid;
  place-items: center;
  padding: 20px;
}
.create-dialog {
  width: min(440px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #363c48;
  border-radius: 16px;
  background: #191c23;
  color: #f2f3f5;
}
h2 { margin: 0 0 16px; font-size: 20px; }
.create-field {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 13px;
  color: #b8bfcb;
}
.create-field input {
  padding: 10px 12px;
  border: 1px solid #4b5363;
  border-radius: 8px;
  background: #12141a;
  color: inherit;
  font: inherit;
}
.create-members { border: 0; padding: 0; margin: 8px 0 20px; }
legend { margin-bottom: 10px; }
.create-member {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
}
.create-member:hover { background: #292e39; }
.create-member span { overflow-wrap: anywhere; min-width: 0; }
.create-actions { display: flex; justify-content: flex-end; gap: 12px; }
button {
  padding: 10px 16px;
  border: 1px solid #4b5363;
  border-radius: 8px;
  color: inherit;
  background: #292e39;
  font: inherit;
  cursor: pointer;
}
button[type="submit"] { background: #315bd5; }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 2px solid #8bb8ff; outline-offset: 3px; }
.create-error { color: #ffb1b1; }
</style>
