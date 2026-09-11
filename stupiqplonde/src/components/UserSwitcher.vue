<script setup lang="ts">
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import type { User } from "../types/user.ts";

defineProps<{
  users: User[];
  currentUserId: number;
}>();

const emit = defineEmits<{
  select: [user: User];
  setAvatar: [user: User, path: string];
}>();

function selectUser(user: User) {
  emit("select", user);
}

async function pickAvatar(user: User) {
  const file = await open({
    multiple: false,
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp", "gif"],
      },
    ],
  });

  if (!file || Array.isArray(file)) return;

  const lower = file.toLowerCase();
  const allowed = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  if (!allowed.some((ext) => lower.endsWith(ext))) return;

  emit("setAvatar", user, file);
}

function avatarSrc(path: string) {
  return path ? convertFileSrc(path) : "";
}
</script>

<template>
  <div class="user-switcher">
    <span class="user-switch__label">
      Пишет:
    </span>
    <button
      v-for="user in users"
      :key="user.id"
      type="button"
      class="user-switcher__button"
      :class="{
        'user-switcher__button-active': user.id === currentUserId,
      }"
      @click="selectUser(user)"
    >
      <span
        class="user-switcher__avatar"
        title="Изменить аватар"
        @click.stop="pickAvatar(user)"
      >
        <img
          v-if="user.avatar"
          :src="avatarSrc(user.avatar)"
          alt=""
        />
        <span v-else>{{ user.name[0] }}</span>
      </span>
      {{ user.name }}
    </button>
  </div>
</template>

<style scoped>
.user-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-switch__label {
  color: #8f96a3;
  font-size: 12px;
}

.user-switcher__button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border: 1px solid #343842;
  border-radius: 999px;
  cursor: pointer;
  background: #20232a;
  color: #afb5c0;
  font: inherit;
  font-size: 12px;
}

.user-switcher__button-active {
  background: #386be0;
  border-color: #386be0;
  color: white;
}

.user-switcher__avatar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  overflow: hidden;
  border-radius: 50%;
  background: #343842;
  color: #f2f3f5;
  font-size: 11px;
  font-weight: 600;
}

.user-switcher__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
