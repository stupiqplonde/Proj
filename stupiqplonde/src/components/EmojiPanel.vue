<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import {
  EMOJI_CATEGORIES,
  filterEmojis,
  type EmojiCategory,
} from "../data/emojis.ts";

const RECENT_KEY = "stupiqplonde.recent-emojis";
const RECENT_LIMIT = 12;

defineProps<{
  title: string;
}>();

const emit = defineEmits<{
  select: [emoji: string];
  close: [];
}>();

const search = ref("");
const activeCategoryId = ref(EMOJI_CATEGORIES[0].id);
const recent = ref<string[]>(loadRecent());

const isSearching = computed(() => search.value.trim().length > 0);

const visibleCategories = computed(() => {
  if (!isSearching.value) {
    return EMOJI_CATEGORIES;
  }

  const matches = filterEmojis(search.value);
  return [
    {
      id: "search",
      label: "Результаты",
      emojis: matches,
    } satisfies EmojiCategory,
  ];
});

const shownCategories = computed(() => {
  if (isSearching.value) {
    return visibleCategories.value;
  }

  return EMOJI_CATEGORIES.filter(
    (category) => category.id === activeCategoryId.value,
  );
});

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function rememberRecent(emoji: string) {
  const next = [emoji, ...recent.value.filter((item) => item !== emoji)].slice(
    0,
    RECENT_LIMIT,
  );
  recent.value = next;
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function selectEmoji(emoji: string) {
  rememberRecent(emoji);
  emit("select", emoji);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("close");
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <section
    class="emoji-panel"
    aria-label="Панель эмодзи"
  >
    <header class="emoji-panel__header">
      <h3>{{ title }}</h3>
      <button
        type="button"
        class="emoji-panel__close"
        @click="emit('close')"
      >
        Закрыть
      </button>
    </header>

    <input
      v-model="search"
      class="emoji-panel__search"
      type="search"
      placeholder="Поиск: lol, сердце, fire"
      autocomplete="off"
    />

    <div
      v-if="recent.length && !isSearching"
      class="emoji-panel__recent"
    >
      <p>Недавние</p>
      <div class="emoji-panel__row">
        <button
          v-for="emoji in recent"
          :key="emoji"
          type="button"
          class="emoji-panel__emoji"
          @click="selectEmoji(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <div
      v-if="!isSearching"
      class="emoji-panel__tabs"
      role="tablist"
    >
      <button
        v-for="category in EMOJI_CATEGORIES"
        :key="category.id"
        type="button"
        role="tab"
        class="emoji-panel__tab"
        :class="{ 'emoji-panel__tab--active': category.id === activeCategoryId }"
        :aria-selected="category.id === activeCategoryId"
        @click="activeCategoryId = category.id"
      >
        {{ category.label }}
      </button>
    </div>

    <div
      v-for="category in shownCategories"
      :key="category.id"
      class="emoji-panel__grid"
    >
      <p
        v-if="category.emojis.length === 0"
        class="emoji-panel__empty"
      >
        Ничего не найдено
      </p>
      <button
        v-for="item in category.emojis"
        :key="item.char"
        type="button"
        class="emoji-panel__emoji"
        :title="item.name"
        @click="selectEmoji(item.char)"
      >
        {{ item.char }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.emoji-panel {
  flex-shrink: 0;
  max-height: 42vh;
  overflow-y: auto;
  padding: 12px 20px 14px;
  border-top: 1px solid #252830;
  background: #17191f;
}

.emoji-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.emoji-panel__header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #afb5c0;
}

.emoji-panel__close,
.emoji-panel__tab {
  padding: 4px 8px;
  border: 1px solid #343842;
  border-radius: 6px;
  cursor: pointer;
  color: #afb5c0;
  background: #20232a;
  font: inherit;
  font-size: 12px;
}

.emoji-panel__search {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid #343842;
  border-radius: 7px;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
  font-size: 13px;
}

.emoji-panel__search:focus {
  outline: none;
  border-color: #4f7fa4;
}

.emoji-panel__recent {
  margin-bottom: 10px;
}

.emoji-panel__recent p,
.emoji-panel__empty {
  margin: 0 0 6px;
  color: #8f96a3;
  font-size: 12px;
}

.emoji-panel__row,
.emoji-panel__grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
}

.emoji-panel__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.emoji-panel__tab--active {
  border-color: #386be0;
  color: white;
  background: #386be0;
}

.emoji-panel__emoji {
  padding: 6px 0;
  border: 1px solid #343842;
  border-radius: 7px;
  cursor: pointer;
  color: inherit;
  background: #20232a;
  font-size: 18px;
  line-height: 1;
}

.emoji-panel__emoji:hover {
  border-color: #4f7fa4;
  background: #252830;
}
</style>
