<script setup lang="ts">
import { getFileUrl } from "../types/file";
import type { User } from "../types/user";

withDefaults(defineProps<{ user: User; size?: number }>(), { size: 36 });
</script>

<template>
  <span class="user-avatar" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * .36}px` }">
    <img v-if="user.avatar_path" :src="getFileUrl(user.avatar_path)" alt="" />
    <span v-else>{{ user.display_name.slice(0, 1).toUpperCase() }}</span>
  </span>
</template>

<style scoped>
.user-avatar { display: inline-grid; place-items: center; flex-shrink: 0; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 600; overflow: hidden; }
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
</style>
