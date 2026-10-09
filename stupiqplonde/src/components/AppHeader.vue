<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
defineProps<{ status: string }>();
</script>

<template>
  <header class="header">
    <div class="header-title"><AppIcon name="chat" :size="17" /><span>Ваше пространство</span></div>
    <div class="header-status" :title="status"><span class="status-dot"></span>На этом устройстве</div>
  </header>
</template>

<style scoped>
.header { height: 54px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 24px; border-bottom: 1px solid var(--border); background: var(--surface); }
.header-title { display: flex; align-items: center; gap: 9px; font-size: 12px; font-weight: 550; }.header-title svg { color: var(--muted); }
.header-status { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 10px; white-space: nowrap; }.status-dot { width: 5px; height: 5px; background: #34c759; border-radius: 50%; }
@media (max-width: 720px) { .header-status { display: none; } }
</style>
