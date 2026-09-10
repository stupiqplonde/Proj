<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  create: [title: string];
}>();

const title = ref("");

watch(
  () => props.open,
  (open) => {
    if (open) title.value = "";
  },
);

function submit() {
  const value = title.value.trim();
  if (!value) return;
  emit("create", value);
}
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <form class="sheet" @submit.prevent="submit">
      <h3>Новый чат</h3>
      <input v-model="title" placeholder="Название" autofocus />
      <div class="row">
        <button type="button" @click="emit('close')">Отмена</button>
        <button class="ok" type="submit">Создать</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(4, 10, 16, 0.55);
}

.sheet {
  width: min(380px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: 18px;
  background: #17212b;
  box-shadow: var(--shadow);
}

h3 {
  margin: 0;
}

input {
  border: 0;
  border-radius: 12px;
  padding: 10px 12px;
  background: #242f3d;
  color: var(--text);
  outline: none;
}

.row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  background: #242f3d;
  cursor: pointer;
}

.ok {
  background: var(--accent);
  color: #041018;
  font-weight: 700;
}
</style>
