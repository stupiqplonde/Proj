<script setup lang="ts">
import { computed, ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getFileUrl } from "../types/file";
import type { ProfileUpdate, User } from "../types/user";

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  save: [profile: ProfileUpdate];
  close: [];
}>();

const displayName = ref(props.user.display_name);
const userStatus = ref(props.user.status);
const avatarPath = ref<string | null>(props.user.avatar_path);
const avatarError = ref("");

const avatarSrc = computed(() =>
  avatarPath.value ? getFileUrl(avatarPath.value) : "",
);

const initials = computed(() => {
  const name = displayName.value.trim() || props.user.username;
  return name.slice(0, 1).toUpperCase();
});

async function pickAvatar() {
  avatarError.value = "";

  const file = await open({
    multiple: false,
    filters: [
      {
        name: "Image",
        extensions: ["png", "jpg", "jpeg", "webp", "gif"],
      },
    ],
  });

  if (!file) {
    return;
  }

  try {
    avatarPath.value = await invoke<string>("save_attachment", {
      source: file,
    });
  } catch (error) {
    avatarError.value =
      error instanceof Error ? error.message : "Не удалось загрузить аватар";
  }
}

function clearAvatar() {
  avatarPath.value = null;
  avatarError.value = "";
}

function submitProfile() {
  const cleanDisplayName = displayName.value.trim();

  if (!cleanDisplayName) {
    return;
  }

  emit("save", {
    displayName: cleanDisplayName,
    status: userStatus.value.trim(),
    avatarPath: avatarPath.value,
  });
}
</script>

<template>
  <div class="profile-backdrop" @click.self="emit('close')">
    <section
      class="profile-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
    >
      <header class="profile-card__header">
        <h2 id="profile-title">Профиль</h2>
        <button
          type="button"
          class="profile-card__close"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <form class="profile-form" @submit.prevent="submitProfile">
        <div class="profile-avatar">
          <img
            v-if="avatarSrc"
            class="profile-avatar__image"
            :src="avatarSrc"
            alt="Аватар"
          />
          <span v-else class="profile-avatar__fallback">{{ initials }}</span>
          <div class="profile-avatar__actions">
            <button
              type="button"
              class="profile-button profile-button--secondary"
              @click="pickAvatar"
            >
              Загрузить фото
            </button>
            <button
              v-if="avatarPath"
              type="button"
              class="profile-button profile-button--ghost"
              @click="clearAvatar"
            >
              Убрать
            </button>
          </div>
        </div>
        <p v-if="avatarError" class="profile-error" role="alert">
          {{ avatarError }}
        </p>
        <label for="profile-display-name" class="profile-field">
          <span>Отображаемое имя</span>
          <input
            id="profile-display-name"
            v-model="displayName"
            type="text"
            maxlength="40"
            required
          />
        </label>
        <label for="profile-status" class="profile-field">
          <span>Статус</span>
          <textarea
            id="profile-status"
            v-model="userStatus"
            maxlength="120"
            rows="3"
          ></textarea>
        </label>
        <div class="profile-username">
          <span>username</span>
          <strong>@{{ user.username }}</strong>
        </div>
        <footer class="profile-actions">
          <button
            type="button"
            class="profile-button profile-button--secondary"
            @click="emit('close')"
          >
            Отмена
          </button>
          <button type="submit" class="profile-button profile-button--primary">
            Сохранить
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>

<style scoped>
.profile-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #000a;
}

.profile-card {
  width: min(440px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #363c48;
  border-radius: 16px;
  background: #191c23;
  color: #f2f3f5;
}

.profile-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.profile-card__header h2 {
  margin: 0;
  font-size: 20px;
}

.profile-card__close {
  width: 32px;
  height: 32px;
  border: 1px solid #4b5363;
  border-radius: 8px;
  background: #292e39;
  color: inherit;
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.profile-form {
  display: grid;
  gap: 16px;
}

.profile-avatar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar__image,
.profile-avatar__fallback {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  flex-shrink: 0;
}

.profile-avatar__image {
  object-fit: cover;
  border: 1px solid #363c48;
}

.profile-avatar__fallback {
  display: grid;
  place-items: center;
  background: #315bd5;
  font-size: 28px;
  font-weight: 600;
}

.profile-avatar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-field {
  display: grid;
  gap: 8px;
  color: #b8bfcb;
  font-size: 13px;
}

.profile-field input,
.profile-field textarea {
  padding: 10px 12px;
  border: 1px solid #363c48;
  border-radius: 8px;
  background: #111318;
  color: inherit;
  font: inherit;
  resize: vertical;
}

.profile-field input:focus-visible,
.profile-field textarea:focus-visible,
.profile-button:focus-visible,
.profile-card__close:focus-visible {
  outline: 2px solid #8bb8ff;
  outline-offset: 3px;
}

.profile-username {
  display: grid;
  gap: 4px;
  color: #8f96a3;
  font-size: 13px;
}

.profile-username strong {
  color: #f2f3f5;
  font-weight: 600;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.profile-button {
  padding: 10px 16px;
  border: 1px solid #4b5363;
  border-radius: 8px;
  background: #292e39;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.profile-button--primary {
  background: #315bd5;
  border-color: #315bd5;
}

.profile-button--ghost {
  background: transparent;
}

.profile-error {
  margin: 0;
  color: #ffb1b1;
  font-size: 13px;
}
</style>
