<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { telemetry, type TelemetryEntry } from '../services/telemetry'
import { AudioDriverManager } from '@collidor/axon'

const isOpen = ref(false)
const logs = ref<TelemetryEntry[]>([])
const selectedFilter = ref<'all' | 'event' | 'command' | 'audio' | 'graph'>('all')
const inspectEntry = ref<TelemetryEntry | null>(null)

// Audio context telemetry
const audioState = ref('suspended')
const sampleRate = ref(44100)
const currentTime = ref(0)

let timer: number | null = null
let unsub: (() => void) | null = null

const filteredLogs = computed(() => {
  if (selectedFilter.value === 'all') return logs.value
  return logs.value.filter((l) => l.category === selectedFilter.value)
})

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function clearLogs() {
  telemetry.clear()
  logs.value = []
  inspectEntry.value = null
}

function pollAudioState() {
  try {
    const ctx = AudioDriverManager.get().getContext()
    audioState.value = ctx.state
    sampleRate.value = ctx.sampleRate
    currentTime.value = Number(ctx.currentTime.toFixed(2))
  } catch (e) {
    // Audio driver not yet initialized
  }
}

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(logs.value, null, 2))
}

onMounted(() => {
  logs.value = telemetry.getLogs()
  unsub = telemetry.subscribe((entry) => {
    logs.value = [entry, ...logs.value.slice(0, 199)]
  })
  timer = window.setInterval(pollAudioState, 500)
  pollAudioState()
})

onUnmounted(() => {
  if (unsub) unsub()
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div :class="['devtools-dock', { open: isOpen }]">
    <!-- Dock Header -->
    <div class="dock-header" @click="toggleOpen">
      <div class="header-left">
        <span class="dock-icon">⚡</span>
        <span class="dock-title">Axon DevTools &amp; Telemetry Dock</span>
        <span class="dock-counter">{{ logs.length }} logs</span>

        <!-- Audio status pill -->
        <span :class="['audio-pill', { active: audioState === 'running' }]">
          {{ audioState === 'running' ? '● Audio Active' : '○ Audio Idle' }}
        </span>
      </div>

      <div class="header-right">
        <!-- Filters when open -->
        <div v-if="isOpen" class="filter-pills" @click.stop>
          <button
            :class="['filter-btn', { active: selectedFilter === 'all' }]"
            @click="selectedFilter = 'all'"
          >
            All
          </button>
          <button
            :class="['filter-btn', { active: selectedFilter === 'audio' }]"
            @click="selectedFilter = 'audio'"
          >
            Audio
          </button>
          <button
            :class="['filter-btn', { active: selectedFilter === 'graph' }]"
            @click="selectedFilter = 'graph'"
          >
            Graph
          </button>
          <button
            :class="['filter-btn', { active: selectedFilter === 'command' }]"
            @click="selectedFilter = 'command'"
          >
            Commands
          </button>
          <button class="action-btn-sm" @click="copyJson" title="Copy Telemetry JSON">
            📋 Copy JSON
          </button>
          <button class="action-btn-sm" @click="clearLogs" title="Clear logs">
            ✕ Clear
          </button>
        </div>

        <button class="toggle-btn">
          {{ isOpen ? '▼ Collapse' : '▲ Open DevTools' }}
        </button>
      </div>
    </div>

    <!-- Dock Body -->
    <div v-show="isOpen" class="dock-body">
      <!-- Left: Logs List -->
      <div class="logs-pane">
        <div v-if="filteredLogs.length === 0" class="empty-hint">
          No telemetry events recorded yet. Perform node edits, run tests, or trigger audio to see live events.
        </div>
        <div
          v-for="entry in filteredLogs"
          :key="entry.id"
          :class="['log-row', { selected: inspectEntry?.id === entry.id }]"
          @click="inspectEntry = entry"
        >
          <span :class="['category-badge', entry.category]">{{ entry.category }}</span>
          <span class="action-name">{{ entry.action }}</span>
          <span class="source-name">{{ entry.source }}</span>
          <span class="time-label">{{ new Date(entry.timestamp).toLocaleTimeString() }}</span>
        </div>
      </div>

      <!-- Right: Telemetry Detail & Audio Monitor -->
      <div class="telemetry-detail-pane">
        <div class="monitor-card">
          <h4>Web Audio Status</h4>
          <div class="monitor-stats">
            <div>State: <strong>{{ audioState }}</strong></div>
            <div>Sample Rate: <strong>{{ sampleRate }} Hz</strong></div>
            <div>Time: <strong>{{ currentTime }}s</strong></div>
          </div>
        </div>

        <div class="detail-card">
          <h4>Selected Event Detail</h4>
          <div v-if="inspectEntry" class="detail-content">
            <div>Action: <strong>{{ inspectEntry.action }}</strong></div>
            <div>Source: <strong>{{ inspectEntry.source }}</strong></div>
            <pre class="json-viewer">{{ JSON.stringify(inspectEntry.payload, null, 2) }}</pre>
          </div>
          <div v-else class="empty-hint">
            Click on any telemetry entry to inspect its payload.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.devtools-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: var(--ui-color-surface-elevated, oklch(0.14 0.02 260));
  border-top: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.4);
  font-family: inherit;
  transition: height 0.2s ease;
}

.devtools-dock.open {
  height: 320px;
}

.dock-header {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.236em;
  background: var(--ui-color-surface, oklch(0.16 0.025 260));
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.8em;
}

.dock-icon {
  color: var(--ui-color-accent, oklch(0.75 0.22 150));
}

.dock-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ui-color-text, #ffffff);
}

.dock-counter {
  font-size: 0.72rem;
  padding: 0.15em 0.5em;
  background: var(--ui-color-surface-elevated, oklch(0.22 0.025 260));
  border-radius: 10px;
  color: var(--ui-color-text-muted, oklch(0.75 0.02 260));
}

.audio-pill {
  font-size: 0.72rem;
  padding: 0.15em 0.6em;
  border-radius: 10px;
  background: var(--ui-color-surface-elevated, oklch(0.22 0.025 260));
  color: var(--ui-color-text-muted, oklch(0.65 0.02 260));
}

.audio-pill.active {
  background: color-mix(in oklch, oklch(0.7 0.2 145) 20%, transparent);
  color: oklch(0.75 0.2 145);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.8em;
}

.filter-pills {
  display: flex;
  align-items: center;
  gap: 0.4em;
}

.filter-btn, .action-btn-sm {
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 4px);
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
  padding: 0.2em 0.5em;
  font-size: 0.72rem;
  cursor: pointer;
}

.filter-btn.active {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
  border-color: var(--ui-color-primary, oklch(0.65 0.22 260));
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--ui-color-text-muted, oklch(0.75 0.02 260));
  font-size: 0.75rem;
  cursor: pointer;
}

.dock-body {
  height: calc(320px - 38px);
  display: grid;
  grid-template-columns: 1fr 340px;
  overflow: hidden;
}

.logs-pane {
  overflow-y: auto;
  border-right: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  padding: 0.4em 0;
}

.log-row {
  display: flex;
  align-items: center;
  gap: 0.8em;
  padding: 0.35em 1em;
  font-size: 0.8rem;
  cursor: pointer;
  border-bottom: 1px solid var(--ui-color-border, oklch(0.18 0.02 260));
}

.log-row:hover {
  background: var(--ui-color-surface-hover, oklch(0.2 0.025 260));
}

.log-row.selected {
  background: color-mix(in oklch, var(--ui-color-primary, oklch(0.65 0.22 260)) 15%, transparent);
}

.category-badge {
  font-size: 0.68rem;
  padding: 0.1em 0.45em;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 700;
}

.category-badge.audio {
  background: color-mix(in oklch, oklch(0.75 0.22 150) 20%, transparent);
  color: oklch(0.8 0.22 150);
}

.category-badge.graph {
  background: color-mix(in oklch, oklch(0.65 0.22 260) 20%, transparent);
  color: oklch(0.75 0.22 260);
}

.category-badge.command {
  background: color-mix(in oklch, oklch(0.65 0.22 30) 20%, transparent);
  color: oklch(0.8 0.22 30);
}

.category-badge.event {
  background: color-mix(in oklch, oklch(0.65 0.22 300) 20%, transparent);
  color: oklch(0.8 0.22 300);
}

.action-name {
  color: var(--ui-color-text, #ffffff);
  font-weight: 600;
}

.source-name {
  color: var(--ui-color-text-muted, oklch(0.65 0.02 260));
}

.time-label {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--ui-color-text-muted, oklch(0.55 0.02 260));
}

.telemetry-detail-pane {
  overflow-y: auto;
  padding: 0.8em 1em;
  display: flex;
  flex-direction: column;
  gap: 0.8em;
}

.monitor-card, .detail-card {
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  padding: 0.618em 0.8em;
}

.monitor-card h4, .detail-card h4 {
  margin: 0 0 0.4em 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ui-color-text-muted, oklch(0.7 0.02 260));
}

.monitor-stats {
  display: flex;
  gap: 1em;
  font-size: 0.75rem;
  color: var(--ui-color-text, #ffffff);
}

.detail-content {
  font-size: 0.78rem;
  color: var(--ui-color-text, #ffffff);
}

.json-viewer {
  margin: 0.4em 0 0 0;
  max-height: 120px;
  overflow-y: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.72rem;
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  padding: 0.4em;
  border-radius: 4px;
  color: var(--ui-color-accent, oklch(0.75 0.22 150));
}

.empty-hint {
  font-size: 0.75rem;
  color: var(--ui-color-text-muted, oklch(0.6 0.02 260));
  font-style: italic;
  padding: 1em;
}
</style>
