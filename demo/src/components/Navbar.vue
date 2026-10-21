<script setup lang="ts">
import { ref, onMounted } from 'vue'

export type TabId = 'docs' | 'studio' | 'gallery' | 'music' | 'tests'

const props = withDefaults(
  defineProps<{
    currentTab?: TabId
  }>(),
  {
    currentTab: 'docs',
  },
)

const emit = defineEmits<{
  (e: 'tabChange', tab: TabId): void
  (e: 'themeChange', theme: string): void
}>()

declare const __AXON_VERSION__: string
const version = typeof __AXON_VERSION__ !== 'undefined' ? __AXON_VERSION__ : '0.1.0'
const currentTheme = ref('dark')

const themes = [
  { id: 'dark', label: 'Dark Matte' },
  { id: 'neumorphic', label: 'Neumorphic' },
  { id: 'jewel', label: 'Jewel Nouveau' },
  { id: 'troy-strategy', label: 'Troy Strategy' },
  { id: 'rpg-parchment', label: 'RPG Parchment' },
]

function setTheme(theme: string) {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('collidor-theme', theme)
  emit('themeChange', theme)
}

function selectTab(tab: TabId) {
  emit('tabChange', tab)
  window.location.hash = tab
}

onMounted(() => {
  const saved = localStorage.getItem('collidor-theme')
  if (saved) {
    currentTheme.value = saved
    document.documentElement.setAttribute('data-theme', saved)
  }
})
</script>

<template>
  <header class="docs-header">
    <div class="header-left">
      <a href="#docs" class="brand" @click.prevent="selectTab('docs')">
        <svg viewBox="0 0 32 32" width="26" height="26">
          <defs>
            <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#818cf8" />
              <stop offset="100%" stop-color="#c084fc" />
            </linearGradient>
          </defs>
          <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="url(#brand-grad)" opacity="0.9" />
          <polygon points="16,6 26,12 26,20 16,26 6,20 6,12" fill="#090d16" />
          <circle cx="16" cy="16" r="4" fill="#38bdf8" />
        </svg>
        <span>AXON</span>
        <span class="brand-badge">v{{ version }}</span>
      </a>

      <nav class="header-tabs">
        <button
          type="button"
          :class="['header-tab-btn', { active: currentTab === 'docs' }]"
          @click="selectTab('docs')"
        >
          <span>📖 Docs</span>
        </button>
        <button
          type="button"
          :class="['header-tab-btn', { active: currentTab === 'studio' }]"
          @click="selectTab('studio')"
        >
          <span>⬡ Studio IDE</span>
        </button>
        <button
          type="button"
          :class="['header-tab-btn', { active: currentTab === 'music' }]"
          @click="selectTab('music')"
        >
          <span>♪ Music Station</span>
        </button>
        <button
          type="button"
          :class="['header-tab-btn', { active: currentTab === 'gallery' }]"
          @click="selectTab('gallery')"
        >
          <span>▦ Node Gallery</span>
        </button>
        <button
          type="button"
          :class="['header-tab-btn', { active: currentTab === 'tests' }]"
          @click="selectTab('tests')"
        >
          <span>✓ Test Suite</span>
        </button>
      </nav>
    </div>

    <div class="header-right">
      <select
        :value="currentTheme"
        class="theme-select"
        @change="(e) => setTheme((e.target as HTMLSelectElement).value)"
      >
        <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>

      <a
        href="https://github.com/collidor/axon"
        target="_blank"
        rel="noopener noreferrer"
        class="header-tab-btn"
        title="View GitHub Repository"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <span>GitHub</span>
      </a>
    </div>
  </header>
</template>
