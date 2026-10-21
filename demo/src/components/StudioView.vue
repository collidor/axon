<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PRESET_DEMOS, type PresetDemo } from '../presets'
import CodeBlock from './CodeBlock.vue'

const studioRef = ref<any>(null)
const activePreset = ref<string>(PRESET_DEMOS[0].id)
const compiledCode = ref<string>('')
const executionResult = ref<string>('')
const showCodeDrawer = ref<boolean>(false)
const isFullscreen = ref<boolean>(false)

function loadPreset(preset: PresetDemo) {
  activePreset.value = preset.id
  if (studioRef.value) {
    studioRef.value.importJSON(preset.graph)
  }
}

function generateCode() {
  if (studioRef.value) {
    const code = studioRef.value.compileGraph({ typescript: true })
    compiledCode.value = code || '// No compilable nodes currently selected in graph.'
    executionResult.value = ''
    showCodeDrawer.value = true
  }
}

function runCompiledCode() {
  try {
    const cleanJs = compiledCode.value
      .replace(/export\s+/g, '')
      .replace(/:\s*[A-Za-z0-9_<>[\]|&{}]+/g, '')
    const fn = new Function(`${cleanJs}; return typeof executeCompiledGraph === 'function' ? executeCompiledGraph() : typeof run === 'function' ? run() : 'Code compiled successfully without errors.';`)
    const res = fn()
    executionResult.value = typeof res === 'object' ? JSON.stringify(res) : String(res)
  } catch (err: any) {
    executionResult.value = `Execution Error: ${err.message}`
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function exportGraph() {
  if (studioRef.value) {
    studioRef.value.exportJSON()
  }
}

onMounted(() => {
  // Load initial preset
  setTimeout(() => {
    const preset = PRESET_DEMOS[0]
    if (preset && studioRef.value) {
      studioRef.value.importJSON(preset.graph)
    }
  }, 100)
})

onUnmounted(() => {
  if (studioRef.value && typeof studioRef.value.stopAudio === 'function') {
    studioRef.value.stopAudio()
  }
})
</script>

<template>
  <div :class="['studio-view-container', { 'is-fullscreen': isFullscreen }]">
    <!-- Studio Header & Preset Switcher -->
    <header class="studio-header">
      <div class="preset-selector">
        <span class="preset-label">Presets:</span>
        <button
          v-for="preset in PRESET_DEMOS"
          :key="preset.id"
          :class="['preset-btn', { active: activePreset === preset.id }]"
          :title="preset.description"
          @click="loadPreset(preset)"
        >
          <span class="preset-icon">{{ preset.icon }}</span>
          <span>{{ preset.name }}</span>
        </button>
      </div>

      <div class="studio-actions">
        <button class="action-btn" @click="generateCode">
          <span>⚡ Compile TypeScript</span>
        </button>
        <button class="action-btn" @click="toggleFullscreen">
          <span>{{ isFullscreen ? '⤢ Minimize' : '⤢ Fullscreen' }}</span>
        </button>
      </div>
    </header>

    <!-- Embedded Axon Studio Custom Element -->
    <div class="studio-body">
      <axon-studio ref="studioRef" style="width: 100%; height: 100%; display: block;"></axon-studio>
    </div>

    <!-- Live TypeScript Compiler Drawer Modal -->
    <div v-if="showCodeDrawer" class="code-drawer-overlay" @click.self="showCodeDrawer = false">
      <div class="code-drawer">
        <div class="drawer-header">
          <h3>⚡ Pure TypeScript Compiled Output (Zero Overhead)</h3>
          <div class="drawer-actions">
            <button class="run-code-btn" @click="runCompiledCode">▶ Run Code</button>
            <button class="close-btn" @click="showCodeDrawer = false">✕</button>
          </div>
        </div>
        <p class="drawer-desc">
          This TypeScript code was compiled directly from the visual node network. It executes headlessly without any runtime dependencies!
        </p>
        <div v-if="executionResult" class="exec-result-box">
          <strong>Execution Output:</strong> {{ executionResult }}
        </div>
        <div class="drawer-content">
          <CodeBlock language="typescript" :code="compiledCode" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.studio-view-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  width: 100%;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  position: relative;
  overflow: hidden;
}

.studio-view-container.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
}

.studio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.618em 1.236em;
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  border-bottom: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  gap: 1em;
  flex-wrap: wrap;
}

.preset-selector {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ui-color-text-muted, oklch(0.65 0.02 260));
  margin-right: 0.3em;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.35em 0.75em;
  background: var(--ui-color-surface, oklch(0.14 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  background: var(--ui-color-surface-hover, oklch(0.22 0.025 260));
  color: var(--ui-color-text, #ffffff);
}

.preset-btn.active {
  background: color-mix(in oklch, var(--ui-color-primary, oklch(0.65 0.22 260)) 20%, transparent);
  border-color: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: var(--ui-color-primary, oklch(0.75 0.22 260));
  font-weight: 600;
}

.studio-actions {
  display: flex;
  align-items: center;
  gap: 0.618em;
}

.action-btn {
  display: flex;
  align-items: center;
  padding: 0.4em 0.85em;
  background: var(--ui-color-surface, oklch(0.14 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: var(--ui-color-text, #ffffff);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
}

.studio-body {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.code-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2em;
  box-sizing: border-box;
}

.code-drawer {
  background: var(--ui-color-surface, oklch(0.14 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.3 0.02 260));
  border-radius: var(--ui-radius-lg, 12px);
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 1.618em;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5em;
}

.drawer-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--ui-color-text, #ffffff);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--ui-color-text-muted, oklch(0.7 0.02 260));
  font-size: 1.2rem;
  cursor: pointer;
}

.drawer-desc {
  font-size: 0.85rem;
  color: var(--ui-color-text-muted, oklch(0.75 0.02 260));
  margin: 0 0 1em 0;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
}
</style>
