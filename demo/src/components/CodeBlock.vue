<script setup lang="ts">
import { ref, computed } from 'vue'
import Prism from 'prismjs'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'

const props = withDefaults(
  defineProps<{
    code: string
    language?: string
    title?: string
  }>(),
  {
    language: 'typescript',
    title: '',
  },
)

const copied = ref(false)

const highlightedCode = computed(() => {
  const lang = props.language
  const grammar = Prism.languages[lang] || Prism.languages.typescript || Prism.languages.javascript
  if (!grammar) return props.code
  return Prism.highlight(props.code, grammar, lang)
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}
</script>

<template>
  <div class="code-block">
    <div class="code-header">
      <div class="code-title">
        <span class="code-dot"></span>
        <span>{{ title || language.toUpperCase() }}</span>
      </div>
      <button class="copy-btn" @click="copyToClipboard" :title="copied ? 'Copied!' : 'Copy to clipboard'">
        {{ copied ? '✓ Copied' : 'Copy' }}
      </button>
    </div>
    <pre :class="`language-${language}`" spellcheck="false"><code :class="`language-${language}`" spellcheck="false" v-html="highlightedCode"></code></pre>
  </div>
</template>
