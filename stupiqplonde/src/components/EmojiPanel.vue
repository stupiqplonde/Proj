<script setup lang="ts">

</script>

<template>

  <form
      class="emoji"
      @submit.prevent=""
  >
  <div
      class="emojes"
  >

    <button>🥶</button>
    <button>🤡</button>
    <button>🧛‍♀️</button>
  </div>

  </form>

</template>

<style scoped>

.emoji{
  display: flex;
  /* position: sticky; */
  bottom: 0;
  gap: 20px;
  padding: 15px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
  flex-shrink: 0;
}

.emoji button{
  padding: 10px 18px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: #434365;
  font: inherit;
  font-weight: 600;
}

</style>