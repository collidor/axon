<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  createMathNode,
  createConstantNode,
  createLogicNode,
  createCompareNode,
  createGateNode,
  createFeedbackNode,
  createAudioClockNode,
  createSequenceNode,
  createParallelNode,
  createEuclideanNode,
  createChordNode,
  createScaleQuantizerNode,
  BaseGraph,
} from '@collidor/axon'

interface NodeDemoDef {
  id: string
  name: string
  category: string
  description: string
  inputs: Record<string, { type: 'number' | 'string' | 'boolean'; default: any; min?: number; max?: number; step?: number; options?: string[] }>
  createEngine: () => any
}

const DEMO_NODES: NodeDemoDef[] = [
  // 1. Math
  {
    id: 'math',
    name: 'Math Operation',
    category: 'Math & Numbers',
    description: 'Executes arithmetic operations (ADD, SUBTRACT, MULTIPLY, DIVIDE, POWER, MODULO) between inputs A and B.',
    inputs: {
      a: { type: 'number', default: 24 },
      b: { type: 'number', default: 8 },
      operator: { type: 'string', default: 'ADD', options: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'POWER', 'MODULO'] },
    },
    createEngine: () => createMathNode(),
  },
  {
    id: 'constant',
    name: 'Constant Value',
    category: 'Math & Numbers',
    description: 'Emits a static constant number, string, or boolean value to downstream ports.',
    inputs: {
      value: { type: 'number', default: 42 },
    },
    createEngine: () => createConstantNode(),
  },

  // 2. Logic & Flow
  {
    id: 'compare',
    name: 'Compare',
    category: 'Logic & Flow',
    description: 'Compares two values using relational operators (EQUALS, GREATER_THAN, LESS_THAN, etc.).',
    inputs: {
      a: { type: 'number', default: 15 },
      b: { type: 'number', default: 10 },
      operator: { type: 'string', default: 'GREATER_THAN', options: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_EQUAL', 'LESS_EQUAL'] },
    },
    createEngine: () => createCompareNode(),
  },
  {
    id: 'logic',
    name: 'Boolean Logic',
    category: 'Logic & Flow',
    description: 'Performs boolean operations (AND, OR, NOT, XOR, NAND, NOR) across inputs.',
    inputs: {
      a: { type: 'boolean', default: true },
      b: { type: 'boolean', default: false },
      operator: { type: 'string', default: 'AND', options: ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR'] },
    },
    createEngine: () => createLogicNode(),
  },
  {
    id: 'gate',
    name: 'Signal Gate',
    category: 'Logic & Flow',
    description: 'Conditionally routes or blocks an incoming signal based on boolean condition input.',
    inputs: {
      value: { type: 'number', default: 100 },
      open: { type: 'boolean', default: true },
    },
    createEngine: () => createGateNode(),
  },
  {
    id: 'feedback',
    name: 'Feedback Delay (Z⁻¹)',
    category: 'Logic & Flow',
    description: 'Buffers incoming value and outputs it on the subsequent frame/tick to break cycles.',
    inputs: {
      input: { type: 'number', default: 5 },
    },
    createEngine: () => createFeedbackNode(),
  },

  // 3. Audio & Music
  {
    id: 'sequence',
    name: 'Step Sequence Node',
    category: 'Audio & Music',
    description: 'Sequentially subdivides clock cycles across musical notes or rhythm triggers (e.g. C4 E4 G4 B4).',
    inputs: {
      notes: { type: 'string', default: 'C4 E4 G4 B4' },
      velocity: { type: 'number', default: 0.8, min: 0, max: 1, step: 0.05 },
    },
    createEngine: () => createSequenceNode(),
  },
  {
    id: 'euclidean',
    name: 'Euclidean Rhythm',
    category: 'Audio & Music',
    description: 'Generates Bjorklund Euclidean rhythms (e.g. 3 pulses distributed across 8 steps = Tresillo).',
    inputs: {
      pulses: { type: 'number', default: 3, min: 1, max: 16, step: 1 },
      steps: { type: 'number', default: 8, min: 2, max: 32, step: 1 },
      rotation: { type: 'number', default: 0, min: 0, max: 16, step: 1 },
      step: { type: 'number', default: 0, min: 0, max: 31, step: 1 },
    },
    createEngine: () => createEuclideanNode(),
  },
  {
    id: 'chord',
    name: 'Chord Generator',
    category: 'Audio & Music',
    description: 'Converts root note and chord quality into MIDI note arrays (e.g. C + MINOR7 = [C, Eb, G, Bb]).',
    inputs: {
      root: { type: 'string', default: 'C3' },
      quality: { type: 'string', default: 'minor7', options: ['major', 'minor', 'major7', 'minor7', 'dominant7', 'diminished', 'augmented', 'sus4'] },
    },
    createEngine: () => createChordNode(),
  },
  {
    id: 'scale-quantizer',
    name: 'Scale Quantizer',
    category: 'Audio & Music',
    description: 'Snaps continuous or arbitrary MIDI pitches to a chosen musical key and scale.',
    inputs: {
      pitch: { type: 'number', default: 61, min: 24, max: 96, step: 1 },
      root: { type: 'string', default: 'C' },
      scale: { type: 'string', default: 'minor', options: ['major', 'minor', 'dorian', 'mixolydian', 'pentatonic', 'blues'] },
    },
    createEngine: () => createScaleQuantizerNode(),
  },
]

const categories = computed(() => {
  const set = new Set<string>()
  DEMO_NODES.forEach((n) => set.add(n.category))
  return Array.from(set)
})

const selectedNodeId = ref<string>(DEMO_NODES[0].id)
const selectedNode = computed(() => DEMO_NODES.find((n) => n.id === selectedNodeId.value) || DEMO_NODES[0])

const inputState = ref<Record<string, any>>({})
const outputState = ref<Record<string, any>>({})

let activeEngine: any = null
let activeUnsub: (() => void) | null = null

function cleanupSandbox() {
  if (activeUnsub) {
    activeUnsub()
    activeUnsub = null
  }
  if (activeEngine?.destroy) {
    activeEngine.destroy()
  }
  activeEngine = null
}

function initSandbox() {
  cleanupSandbox()
  const nodeDef = selectedNode.value
  const initialState: Record<string, any> = {}
  Object.entries(nodeDef.inputs).forEach(([k, conf]) => {
    initialState[k] = conf.default
  })
  inputState.value = initialState

  // Create engine instance
  activeEngine = nodeDef.createEngine()
  activeUnsub = activeEngine.subscribe((name: string, value: any) => {
    outputState.value = { ...outputState.value, [name]: value }
  })

  // Feed inputs
  Object.entries(initialState).forEach(([k, v]) => {
    activeEngine.setInput(k, v)
  })

  // Read initial outputs
  const outs: Record<string, any> = {}
  if (activeEngine.outputNames) {
    activeEngine.outputNames.forEach((outName: string) => {
      outs[outName] = activeEngine.getOutput(outName)
    })
  }
  outputState.value = outs
}

function updateInput(key: string, val: any) {
  inputState.value[key] = val
  if (activeEngine) {
    activeEngine.setInput(key, val)
    // Refresh outputs
    const outs: Record<string, any> = {}
    if (activeEngine.outputNames) {
      activeEngine.outputNames.forEach((outName: string) => {
        outs[outName] = activeEngine.getOutput(outName)
      })
    }
    outputState.value = { ...outputState.value, ...outs }
  }
}

watch(selectedNodeId, () => {
  initSandbox()
}, { immediate: true })

onUnmounted(() => {
  cleanupSandbox()
})
</script>

<template>
  <div class="gallery-container">
    <!-- Left: Node Catalog Sidebar -->
    <aside class="gallery-sidebar">
      <div class="sidebar-header">
        <h3>Node Catalog</h3>
        <span class="count-badge">{{ DEMO_NODES.length }} Nodes</span>
      </div>

      <div v-for="cat in categories" :key="cat" class="category-group">
        <div class="category-title">{{ cat }}</div>
        <div class="node-list">
          <button
            v-for="n in DEMO_NODES.filter((item) => item.category === cat)"
            :key="n.id"
            :class="['node-item-btn', { active: selectedNodeId === n.id }]"
            @click="selectedNodeId = n.id"
          >
            <span>{{ n.name }}</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Right: Live Workbench Test Bench -->
    <main class="workbench-main">
      <header class="workbench-header">
        <div class="header-info">
          <h2>{{ selectedNode.name }}</h2>
          <span class="category-pill">{{ selectedNode.category }}</span>
        </div>
        <p class="node-desc">{{ selectedNode.description }}</p>
      </header>

      <div class="workbench-content">
        <!-- Input Parameters Panel -->
        <section class="workbench-panel input-panel">
          <div class="panel-header">
            <h3>Input Ports & Controls</h3>
          </div>
          <div class="controls-list">
            <div v-for="(conf, key) in selectedNode.inputs" :key="key" class="control-row">
              <label class="control-label">
                <code>{{ key }}</code>
                <span class="type-hint">({{ conf.type }})</span>
              </label>

              <!-- Number Slider / Input -->
              <div v-if="conf.type === 'number'" class="control-input-group">
                <input
                  v-if="conf.min !== undefined && conf.max !== undefined"
                  type="range"
                  :min="conf.min"
                  :max="conf.max"
                  :step="conf.step || 1"
                  :value="inputState[key]"
                  @input="updateInput(key as string, Number(($event.target as HTMLInputElement).value))"
                  class="range-slider"
                />
                <input
                  type="number"
                  :value="inputState[key]"
                  @input="updateInput(key as string, Number(($event.target as HTMLInputElement).value))"
                  class="text-input num-input"
                />
              </div>

              <!-- String Options Dropdown or Text Input -->
              <div v-else-if="conf.type === 'string'" class="control-input-group">
                <select
                  v-if="conf.options"
                  :value="inputState[key]"
                  @change="updateInput(key as string, ($event.target as HTMLSelectElement).value)"
                  class="select-input"
                >
                  <option v-for="opt in conf.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input
                  v-else
                  type="text"
                  :value="inputState[key]"
                  @input="updateInput(key as string, ($event.target as HTMLInputElement).value)"
                  class="text-input"
                />
              </div>

              <!-- Boolean Switch -->
              <div v-else-if="conf.type === 'boolean'" class="control-input-group">
                <button
                  :class="['toggle-btn', { active: inputState[key] }]"
                  @click="updateInput(key as string, !inputState[key])"
                >
                  {{ inputState[key] ? 'TRUE' : 'FALSE' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Reactive Output Display Panel -->
        <section class="workbench-panel output-panel">
          <div class="panel-header">
            <h3>Reactive Output Signals</h3>
            <span class="live-dot">● Live</span>
          </div>

          <div class="outputs-list">
            <div v-if="Object.keys(outputState).length === 0" class="empty-output">
              Waiting for execution signals...
            </div>
            <div v-for="(val, outKey) in outputState" :key="outKey" class="output-card">
              <div class="output-key">
                <code>{{ outKey }}</code>
              </div>
              <div class="output-value">
                <pre>{{ typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val) }}</pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.gallery-container {
  display: flex;
  height: calc(100vh - 60px);
  width: 100%;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  overflow: hidden;
}

.gallery-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  background: var(--ui-color-surface-elevated, oklch(0.15 0.025 260));
  overflow-y: auto;
  padding: 1.618em 1em;
  box-sizing: border-box;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.618em;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--ui-color-text, #ffffff);
}

.count-badge {
  font-size: 0.75rem;
  padding: 0.2em 0.6em;
  background: var(--ui-color-surface, oklch(0.2 0.02 260));
  border-radius: 12px;
  color: var(--ui-color-text-muted, oklch(0.7 0.02 260));
}

.category-group {
  margin-bottom: 1.618em;
}

.category-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ui-color-text-muted, oklch(0.65 0.02 260));
  margin-bottom: 0.618em;
  padding-left: 0.4em;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 0.236em;
}

.node-item-btn {
  text-align: left;
  padding: 0.45em 0.75em;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ui-radius-sm, 6px);
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.node-item-btn:hover {
  background: var(--ui-color-surface-hover, oklch(0.22 0.025 260));
  color: #ffffff;
}

.node-item-btn.active {
  background: color-mix(in oklch, var(--ui-color-primary, oklch(0.65 0.22 260)) 20%, transparent);
  border-color: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: var(--ui-color-primary, oklch(0.75 0.22 260));
  font-weight: 600;
}

.workbench-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 2.618em;
  box-sizing: border-box;
}

.workbench-header {
  margin-bottom: 2.618em;
  border-bottom: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  padding-bottom: 1.618em;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1em;
  margin-bottom: 0.5em;
}

.header-info h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--ui-color-text, #ffffff);
}

.category-pill {
  padding: 0.25em 0.75em;
  background: var(--ui-color-surface-elevated, oklch(0.2 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.3 0.02 260));
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--ui-color-primary, oklch(0.75 0.22 260));
}

.node-desc {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
}

.workbench-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2em;
}

.workbench-panel {
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 1.618em;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.618em;
  border-bottom: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  padding-bottom: 0.8em;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--ui-color-text, #ffffff);
}

.live-dot {
  font-size: 0.75rem;
  color: oklch(0.7 0.2 145);
  font-weight: 600;
}

.controls-list {
  display: flex;
  flex-direction: column;
  gap: 1.236em;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.85rem;
}

.control-label code {
  color: var(--ui-color-primary, oklch(0.75 0.22 260));
}

.type-hint {
  font-size: 0.75rem;
  color: var(--ui-color-text-muted, oklch(0.65 0.02 260));
}

.control-input-group {
  display: flex;
  align-items: center;
  gap: 0.618em;
}

.text-input {
  flex: 1;
  padding: 0.45em 0.75em;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: #ffffff;
  font-size: 0.85rem;
  outline: none;
}

.num-input {
  max-width: 90px;
}

.select-input {
  width: 100%;
  padding: 0.45em 0.75em;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: #ffffff;
  font-size: 0.85rem;
  outline: none;
}

.range-slider {
  flex: 1;
}

.toggle-btn {
  padding: 0.4em 1em;
  border-radius: var(--ui-radius-sm, 6px);
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  color: var(--ui-color-text-muted, oklch(0.7 0.02 260));
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.toggle-btn.active {
  background: oklch(0.65 0.2 145);
  color: #ffffff;
  border-color: oklch(0.65 0.2 145);
}

.outputs-list {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.output-card {
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  padding: 0.8em 1em;
}

.output-key {
  margin-bottom: 0.4em;
}

.output-key code {
  color: var(--ui-color-accent, oklch(0.75 0.22 150));
  font-size: 0.85rem;
  font-weight: 600;
}

.output-value pre {
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  color: #ffffff;
  white-space: pre-wrap;
}

.empty-output {
  color: var(--ui-color-text-muted, oklch(0.6 0.02 260));
  font-style: italic;
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .gallery-container {
    flex-direction: column;
    height: auto;
  }
  .gallery-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  }
  .workbench-content {
    grid-template-columns: 1fr;
  }
}
</style>
