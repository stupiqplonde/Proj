<script setup lang="ts">
import { ref } from "vue"

// defineEmits сообщает vue какиеиз событий данный компонент в праве рассылать
const emit = defineEmits<{
  send: [body:string];
  addInLine: [body:string];
}>();

// тексткоторый пользователь вводит
const draft = ref("");
const isEmojiOpen = ref(false);

// функция отправки нового соо
function submitMessage(){
  const body = draft.value.trim();

  if(!body) return;

  emit("send", body)

  // отчистка поля после отправки
  draft.value = "";
}

function openEmojiPanel(){
  isEmojiOpen.value = !isEmojiOpen.value;
}

function addEmoji(emoji: string){
  draft.value += emoji;
}

</script>

<template>

  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
    <input
        v-model="draft"
        type="text"
        placeholder="Напишите что-то"
        autocomplete="off"
    />
    <button @click="openEmojiPanel">🤡</button>

    <div v-if="isEmojiOpen">
      <div>

        <button
            type="button"
            @click="addEmoji('🥶')"
        >🥶</button>
        <button
            type="button"
            @click="addEmoji('🤡')"
        >🤡</button>
        <button
            type="button"
            @click="addEmoji('😊')"
        >😊</button>
      </div>
    </div>
    <button type="submit">Отправить</button>


  </form>

</template>

<style scoped>
.composer{
  display: flex;
  /* position: sticky; */
  bottom: 0;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
  flex-shrink: 0;
}

.composer input{
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid #343842;
  border-radius: 7px;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}

.composer input:focus{
  border-color: #4f7fa4;
}

.composer button{
  padding: 0 18px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: #434365;
  font: inherit;
  font-weight: 600;
}

</style>