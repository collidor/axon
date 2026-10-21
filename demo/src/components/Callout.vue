<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'info' | 'tip' | 'warning'
    title?: string
  }>(),
  {
    type: 'info',
    title: '',
  },
)
</script>

<template>
  <div :class="['callout', type]">
    <div v-if="title" class="callout-title">
      <span v-if="type === 'tip'">💡</span>
      <span v-else-if="type === 'warning'">⚠️</span>
      <span v-else>ℹ️</span>
      <span>{{ title }}</span>
    </div>
    <div class="callout-content">
      <slot />
    </div>
  </div>
</template>
