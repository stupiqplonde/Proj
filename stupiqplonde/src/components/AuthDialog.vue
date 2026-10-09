<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import type { Login, Registration, User } from "../types/user";
import AppIcon from "./AppIcon.vue";
import UserAvatar from "./UserAvatar.vue";

const props = defineProps<{
  busy: boolean;
  ready: boolean;
  error: string;
  accounts: User[];
  canClose: boolean;
}>();
const emit = defineEmits<{
  login: [payload: Login];
  register: [payload: Registration];
  select: [user: User];
  reset: [];
  close: [];
  retry: [];
}>();

const mode = ref<"login" | "register">("login");
const login = ref("");
const password = ref("");
const displayName = ref("");
const confirmation = ref("");
const localError = ref("");
const showPassword = ref(false);
const dialog = useTemplateRef<HTMLDivElement>("dialog");
const canSubmit = computed(() => props.ready && !props.busy && login.value.trim() && password.value && (
  mode.value === "login" || displayName.value.trim() && confirmation.value
));
let previousFocus: HTMLElement | null = null;

function changeMode(value: "login" | "register"){
  if (props.busy) return;
  mode.value = value;
  localError.value = "";
  password.value = "";
  confirmation.value = "";
  emit("reset");
}

function submit(){
  if (!canSubmit.value) return;
  localError.value = "";
  if (mode.value === "register") {
    if (password.value !== confirmation.value) {
      localError.value = "Пароли не совпадают.";
      return;
    }
    emit("register", { login: login.value, password: password.value, displayName: displayName.value });
  } else {
    emit("login", { login: login.value, password: password.value });
  }
}

function onKeydown(event: KeyboardEvent){
  if (event.key === "Escape" && props.canClose && !props.busy) emit("close");
  if (event.key !== "Tab") return;
  const controls = Array.from(dialog.value?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)") ?? []);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.value?.focus();
  } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) {
    event.preventDefault(); first.focus();
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value?.focus();
  dialog.value?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
});
watch(() => [props.ready, props.accounts.length, mode.value], async () => {
  await nextTick();
  dialog.value?.querySelector<HTMLElement>("input:not(:disabled), .auth-accounts button:not(:disabled)")?.focus();
});
onBeforeUnmount(() => previousFocus?.focus());
</script>

<template>
  <div class="auth-backdrop">
    <section ref="dialog" class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title"
      :aria-busy="busy || !ready" tabindex="-1" @keydown="onKeydown">
      <button v-if="canClose" class="auth-close icon-button" type="button" :disabled="busy" aria-label="Закрыть" @click="emit('close')"><AppIcon name="close" /></button>
      <div class="auth-logo">e<span>·</span></div>
      <template v-if="accounts.length">
        <p class="eyebrow">ДОБРО ПОЖАЛОВАТЬ</p>
        <h1 id="auth-title">Выберите аккаунт</h1>
        <p class="auth-subtitle">С этими данными доступны несколько профилей.</p>
        <div class="auth-accounts">
          <button v-for="user in accounts" :key="user.id" type="button" :disabled="busy" @click="emit('select', user)">
            <UserAvatar :user="user" :size="44" />
            <span><strong>{{ user.display_name }}</strong><small>@{{ user.username }}</small></span>
            <AppIcon name="chevron" :size="17" />
          </button>
        </div>
        <button type="button" class="auth-back" :disabled="busy" @click="changeMode('login')">Другой логин</button>
      </template>
      <template v-else>
        <p class="eyebrow">ВАШЕ МЕСТО ДЛЯ ОБЩЕНИЯ</p>
        <h1 id="auth-title">{{ mode === 'login' ? 'С возвращением.' : 'Начнём знакомство.' }}</h1>
        <p class="auth-subtitle">{{ mode === 'login' ? 'Войдите, чтобы продолжить разговор.' : 'Создайте аккаунт и будьте на связи.' }}</p>
        <div class="auth-tabs">
          <button type="button" :class="{ active: mode === 'login' }" :disabled="busy" @click="changeMode('login')">Вход</button>
          <button type="button" :class="{ active: mode === 'register' }" :disabled="busy" @click="changeMode('register')">Регистрация</button>
        </div>
        <form @submit.prevent="submit">
          <label v-if="mode === 'register'" class="auth-field">Ваше имя<input v-model="displayName" autocomplete="name" maxlength="40" :disabled="busy || !ready" required placeholder="Как к вам обращаться" /></label>
          <label class="auth-field">Логин<input v-model="login" name="username" autocomplete="username" maxlength="32" :disabled="busy || !ready" required placeholder="Введите логин" /></label>
          <label class="auth-field">Пароль
            <span class="password-field"><input v-model="password" name="password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :minlength="mode === 'register' ? 6 : undefined" maxlength="128" :disabled="busy || !ready" required placeholder="Введите пароль" />
              <button type="button" :disabled="busy" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" @click="showPassword = !showPassword">{{ showPassword ? 'Скрыть' : 'Показать' }}</button>
            </span>
          </label>
          <label v-if="mode === 'register'" class="auth-field">Повторите пароль<input v-model="confirmation" type="password" autocomplete="new-password" maxlength="128" :disabled="busy || !ready" required placeholder="Ещё раз, чтобы не ошибиться" /></label>
          <p v-if="error || localError" class="form-error" role="alert">{{ error || localError }}</p>
          <button v-if="!ready && error" class="auth-back" type="button" :disabled="busy" @click="emit('retry')">Повторить подключение</button>
          <button class="auth-submit" type="submit" :disabled="!canSubmit">{{ !ready ? 'Подключаемся…' : busy ? 'Подождите…' : mode === 'login' ? 'Войти в Encore' : 'Создать аккаунт' }}<AppIcon name="chevron" :size="17" /></button>
        </form>
        <p class="auth-footnote"><AppIcon name="lock" :size="13" /> Аккаунты и сообщения хранятся на этом устройстве</p>
      </template>
      <p v-if="accounts.length && error" class="form-error" role="alert">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.auth-backdrop { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; padding: 24px; overflow-y: auto; background: rgba(29, 35, 48, .38); backdrop-filter: blur(8px); }
.auth-card { position: relative; width: min(420px, 100%); max-height: calc(100dvh - 48px); overflow-y: auto; padding: 34px; border: 1px solid rgba(255,255,255,.8); border-radius: 24px; background: var(--surface); box-shadow: 0 24px 100px #17234526; }
.auth-logo { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; border-radius: 16px; margin-bottom: 26px; background: var(--text); color: white; font-size: 37px; font-weight: 600; letter-spacing: -4px; padding-right: 4px; }
.auth-logo span { color: #6eb8ff; }
.eyebrow { margin: 0 0 10px; font-size: 9px; letter-spacing: .15em; font-weight: 600; color: var(--muted); }
h1 { margin: 0; font-size: 27px; font-weight: 650; letter-spacing: -1px; }
.auth-subtitle { font-size: 13px; color: var(--muted); margin: 10px 0 25px; line-height: 1.5; }
.auth-tabs { display: flex; background: var(--background); padding: 4px; border-radius: 10px; margin-bottom: 24px; }
.auth-tabs button { flex: 1; padding: 9px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 550; }
.auth-tabs button.active { background: white; color: var(--text); box-shadow: 0 1px 4px #00000012; }
.auth-field { display: grid; gap: 8px; margin-bottom: 17px; font-size: 12px; font-weight: 550; }
.auth-field input { width: 100%; padding: 12px 13px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); color: var(--text); font-size: 13px; }
.password-field { position: relative; }
.password-field input { padding-right: 80px; }
.password-field button { position: absolute; right: 12px; top: 0; height: 100%; border: 0; background: none; color: var(--muted); font-size: 11px; }
.auth-submit { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 13px; border: 0; border-radius: 10px; background: var(--accent); color: white; font-size: 13px; font-weight: 550; margin-top: 23px; }
.auth-footnote { display: flex; justify-content: center; gap: 5px; margin: 23px 0 0; color: var(--muted); font-size: 10px; line-height: 1.5; }
.auth-close { position: absolute; right: 15px; top: 15px; }
.auth-accounts { display: grid; gap: 8px; }
.auth-accounts button { display: flex; align-items: center; gap: 12px; width: 100%; border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: white; color: var(--text); text-align: left; }
.auth-accounts button:hover { background: var(--background); }
.auth-accounts button > span:not(.user-avatar) { flex: 1; }
.auth-accounts strong, .auth-accounts small { display: block; }
.auth-accounts strong { font-size: 13px; }.auth-accounts small { font-size: 11px; color: var(--muted); margin-top: 4px; }
.auth-back { display: block; margin: 22px auto 0; background: transparent; border: 0; color: var(--accent); font-size: 12px; }
</style>
