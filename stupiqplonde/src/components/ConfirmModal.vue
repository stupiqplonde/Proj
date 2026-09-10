<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  body: string;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <div class="sheet">
      <h3>{{ title }}</h3>
      <p>{{ body }}</p>
      <div class="row">
        <button type="button" @click="emit('close')">Отмена</button>
        <button class="ok" type="button" @click="emit('confirm')">Удалить</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 25;
  display: grid;
  place-items: center;
  background: rgba(4, 10, 16, 0.55);
}

.sheet {
  width: min(380px, 92vw);
  padding: 18px;
  border-radius: 16px;
  background: #17212b;
  box-shadow: var(--shadow);
}

h3 {
  margin: 0;
}

p {
  color: var(--muted);
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
  background: var(--danger);
  color: white;
}
</style>
