<template>
  <div>
    <h2>Memory leakage</h2>
    <RenderFnSlotComponent>
      <template v-slot="scope">
        <AComponent v-if="show" />
        <span v-if="showError">{{ scope.data.name }}</span>
        <span v-else>{{ scope }}</span>
      </template>
    </RenderFnSlotComponent>
    <BComponent></BComponent>
    <button @click="showError = !showError">showError:{{ showError }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AComponent from './components/AComponent.vue'
import BComponent from './components/BComponent.vue'
import RenderFnSlotComponent from './components/RenderFnSlotComponent'

const show = ref(true)
const showError = ref(false)
</script>
