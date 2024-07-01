<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

setInterval(() => count.value++, 1000)
</script>

<template>
  <div v-if="count >= 0" type="button">time count is {{ count }}</div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
