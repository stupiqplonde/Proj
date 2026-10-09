<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import type { PasswordUpdate, User } from "../types/user";
import AppIcon from "./AppIcon.vue";
import UserAvatar from "./UserAvatar.vue";

const props = defineProps<{ user: User; accounts: User[]; busy: boolean; error: string }>();
const emit = defineEmits<{
  select: [user: User];
  profile: [];
  add: [];
  logout: [];
  password: [payload: PasswordUpdate];
  close: [];
}>();
const isPasswordOpen = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const dialog = useTemplateRef<HTMLElement>("dialog");
let previousFocus: HTMLElement | null = null;

function close(){
  if (!props.busy) emit("close");
}

function onKeydown(event: KeyboardEvent){
  if (event.key === "Escape") close();
  if (event.key !== "Tab") return;
  const controls = Array.from(dialog.value?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)") ?? []);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) { event.preventDefault(); dialog.value?.focus(); }
  else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) { event.preventDefault(); first.focus(); }
}
onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value?.focus();
});
onBeforeUnmount(() => previousFocus?.focus());

function submitPassword(){
  if (props.busy || !currentPassword.value || newPassword.value.length < 6) return;
  emit("password", { currentPassword: currentPassword.value, newPassword: newPassword.value });
}
</script>

<template>
  <div class="account-backdrop" @click.self="close">
    <section ref="dialog" class="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title" tabindex="-1" @keydown="onKeydown">
      <header class="account-header"><span id="account-title">Мой аккаунт</span><button class="icon-button" type="button" aria-label="Закрыть" :disabled="busy" @click="close"><AppIcon name="close" :size="17" /></button></header>
      <div class="account-profile"><UserAvatar :user="user" :size="60" /><div><strong>{{ user.display_name }}</strong><span>@{{ user.username }}</span><small>{{ !user.status || user.status === 'online' ? 'На связи' : user.status }}</small></div></div>
      <div class="account-section">
        <button class="account-action" type="button" :disabled="busy" @click="emit('profile')"><AppIcon name="user" /><span>Редактировать профиль</span><AppIcon name="chevron" :size="15" /></button>
        <button class="account-action" type="button" :disabled="busy" :aria-expanded="isPasswordOpen" @click="isPasswordOpen = !isPasswordOpen"><AppIcon name="lock" /><span>Изменить пароль</span><AppIcon name="chevron" :size="15" /></button>
        <form v-if="isPasswordOpen" class="password-form" @submit.prevent="submitPassword">
          <label>Текущий пароль<input v-model="currentPassword" type="password" autocomplete="current-password" :disabled="busy" required /></label>
          <label>Новый пароль<input v-model="newPassword" type="password" autocomplete="new-password" minlength="6" maxlength="128" :disabled="busy" required /></label>
          <button class="primary-button" type="submit" :disabled="busy || !currentPassword || newPassword.length < 6">{{ busy ? 'Сохраняю…' : 'Сохранить пароль' }}</button>
        </form>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </div>
      <div class="account-section">
        <p class="account-label">АККАУНТЫ</p>
        <button v-for="account in accounts" :key="account.id" type="button" class="account-row" :disabled="busy" @click="emit('select', account)"><UserAvatar :user="account" :size="34" /><span>{{ account.display_name }}</span><AppIcon v-if="account.id === user.id" name="check" :size="18" /></button>
        <button type="button" class="account-action account-add" :disabled="busy" @click="emit('add')"><AppIcon name="plus" /><span>Добавить аккаунт</span></button>
      </div>
      <button type="button" class="account-action account-logout" :disabled="busy" @click="emit('logout')"><AppIcon name="logout" /><span>Выйти из аккаунта</span></button>
      <p class="account-version">Encore · Личное пространство</p>
    </section>
  </div>
</template>

<style scoped>
.account-backdrop { position: fixed; inset: 0; z-index: 1000; background: #1d233026; }
.account-panel { position: absolute; bottom: 18px; left: 78px; width: 320px; max-width: calc(100vw - 96px); max-height: calc(100dvh - 36px); overflow-y: auto; padding: 18px; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); box-shadow: 0 12px 70px #17234526; }
.account-header { display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 12px; }
.account-profile { display: flex; align-items: center; gap: 13px; padding: 18px 0 23px; }.account-profile strong, .account-profile > div span, .account-profile small { display: block; }.account-profile strong { font-size: 17px; letter-spacing: -.3px; }.account-profile > div span { margin-top: 5px; font-size: 12px; color: var(--muted); }.account-profile small { margin-top: 6px; font-size: 11px; color: var(--accent); }
.account-section { padding: 10px 0; border-top: 1px solid var(--border); }
.account-action, .account-row { display: flex; align-items: center; gap: 12px; width: 100%; border: 0; padding: 11px 8px; background: transparent; border-radius: 9px; text-align: left; color: var(--text); font-size: 12px; }.account-action:hover, .account-row:hover { background: var(--background); }.account-action span, .account-row span:not(.user-avatar) { flex: 1; }.account-action > svg { color: var(--muted); }.account-row > svg, .account-add, .account-add > svg { color: var(--accent); }
.account-label { font-size: 9px; color: var(--muted); letter-spacing: .1em; padding: 4px 8px; }.account-logout, .account-logout > svg { color: var(--danger); }.account-logout { border-top: 1px solid var(--border); border-radius: 0; margin-top: 5px; padding-top: 17px; }.account-version { text-align: center; color: var(--muted); font-size: 10px; margin: 16px 0 2px; }
.password-form { display: grid; gap: 12px; margin: 10px 8px; }.password-form label { display: grid; gap: 6px; font-size: 11px; color: var(--muted); }.password-form input { padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text); }
</style>
