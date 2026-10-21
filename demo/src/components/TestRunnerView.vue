<script setup lang="ts">
import { ref } from 'vue'
import {
  BaseGraph,
  createMathNode,
  createLogicNode,
  createCompareNode,
  createSequenceNode,
  createParallelNode,
  createEuclideanNode,
  createChordNode,
  createScaleQuantizerNode,
  createStepSequencerNode,
} from '@collidor/axon'
import { s } from '@collidor/struct'
import { telemetry } from '../services/telemetry'

interface TestCase {
  id: string
  suite: string
  name: string
  status: 'idle' | 'running' | 'passed' | 'failed'
  duration?: number
  error?: string
  run: () => Promise<void> | void
}

const testCases = ref<TestCase[]>([
  // 1. Math Nodes Suite
  {
    id: 'math-add',
    suite: 'Math Operations',
    name: 'MathNode correctly computes addition with defaults',
    status: 'idle',
    run: () => {
      const node = createMathNode()
      node.setInput('a', 15)
      node.setInput('b', 30)
      if (node.getOutput('result') !== 45) {
        throw new Error(`Expected 45, got ${node.getOutput('result')}`)
      }
    },
  },
  {
    id: 'math-ops',
    suite: 'Math Operations',
    name: 'MathNode correctly computes MULTIPLY and POWER',
    status: 'idle',
    run: () => {
      const node = createMathNode()
      node.setInput('a', 6)
      node.setInput('b', 7)
      node.setInput('operator', 'MULTIPLY')
      if (node.getOutput('result') !== 42) {
        throw new Error(`Multiply failed: ${node.getOutput('result')}`)
      }
      node.setInput('a', 2)
      node.setInput('b', 8)
      node.setInput('operator', 'POWER')
      if (node.getOutput('result') !== 256) {
        throw new Error(`Power failed: ${node.getOutput('result')}`)
      }
    },
  },

  // 2. Logic & Flow Suite
  {
    id: 'logic-eval',
    suite: 'Logic & Flow',
    name: 'LogicNode properly evaluates AND, OR, XOR',
    status: 'idle',
    run: () => {
      const node = createLogicNode()
      node.setInput('a', true)
      node.setInput('b', false)
      node.setInput('operator', 'AND')
      if (node.getOutput('result') !== false) throw new Error('AND failed')

      node.setInput('operator', 'OR')
      if (node.getOutput('result') !== true) throw new Error('OR failed')

      node.setInput('operator', 'XOR')
      if (node.getOutput('result') !== true) throw new Error('XOR failed')
    },
  },
  {
    id: 'compare-eval',
    suite: 'Logic & Flow',
    name: 'CompareNode evaluates relational checks',
    status: 'idle',
    run: () => {
      const node = createCompareNode()
      node.setInput('a', 100)
      node.setInput('b', 50)
      node.setInput('operator', 'GREATER_THAN')
      if (node.getOutput('result') !== true) throw new Error('GREATER_THAN failed')

      node.setInput('operator', 'LESS_THAN')
      if (node.getOutput('result') !== false) throw new Error('LESS_THAN failed')
    },
  },

  // 3. Graph Reactive Runtime Suite
  {
    id: 'graph-reactive',
    suite: 'Graph Runtime Engine',
    name: 'BaseGraph connects ports and cascades reactive changes',
    status: 'idle',
    run: async () => {
      const graph = new BaseGraph()
      const n1 = createMathNode()
      n1.id = 'n1'
      const n2 = createMathNode()
      n2.id = 'n2'
      n2.setInput('operator', 'MULTIPLY')
      n2.setInput('b', 2)

      graph.addNode(n1)
      graph.addNode(n2)
      graph.connect('n1:result', 'n2:a')

      n1.setInput('a', 10)
      n1.setInput('b', 15)

      await Promise.resolve()
      if (n2.getOutput('result') !== 50) {
        throw new Error(`Expected 50, got ${n2.getOutput('result')}`)
      }
    },
  },

  // 4. Music & Sequence Engine Suite
  {
    id: 'sequence-eval',
    suite: 'Algorithmic Music',
    name: 'SequenceNode subdivides cycle time across musical notes',
    status: 'idle',
    run: () => {
      const node = createSequenceNode({
        initialData: { notes: ['C4', 'E4', 'G4', 'B4'] },
      })
      const events = node.processArc({
        start: 0,
        end: 1,
        cycle: 0,
        phase: 0,
        time: 0,
        duration: 1,
      })
      if (!Array.isArray(events) || events.length !== 4) {
        throw new Error(`Expected 4 scheduled events, got ${events.length}`)
      }
    },
  },
  {
    id: 'euclidean-eval',
    suite: 'Algorithmic Music',
    name: 'EuclideanNode generates Bjorklund Tresillo rhythm [3, 8]',
    status: 'idle',
    run: () => {
      const node = createEuclideanNode()
      node.setInput('pulses', 3)
      node.setInput('steps', 8)
      node.setInput('rotation', 0)

      // Step 0 should be a pulse (Tresillo hits at 0, 3, 6)
      node.setInput('step', 0)
      if (node.getOutput('trigger') !== true) throw new Error('Step 0 expected pulse')

      node.setInput('step', 1)
      if (node.getOutput('trigger') !== false) throw new Error('Step 1 expected rest')

      node.setInput('step', 3)
      if (node.getOutput('trigger') !== true) throw new Error('Step 3 expected pulse')
    },
  },
  {
    id: 'chord-eval',
    suite: 'Algorithmic Music',
    name: 'ChordNode expands root note into chord pitch arrays',
    status: 'idle',
    run: () => {
      const node = createChordNode()
      node.setInput('root', 'C3')
      node.setInput('quality', 'minor7')
      const notes = node.getOutput('notes') as string[]
      if (!Array.isArray(notes) || notes.length !== 4) {
        throw new Error(`Expected 4 chord notes, got: ${JSON.stringify(notes)}`)
      }
    },
  },
  {
    id: 'quantizer-eval',
    suite: 'Algorithmic Music',
    name: 'ScaleQuantizer snaps non-diatonic pitch to minor scale',
    status: 'idle',
    run: () => {
      const node = createScaleQuantizerNode()
      node.setInput('root', 'C')
      node.setInput('scale', 'minor')
      node.setInput('pitch', 61) // C# -> snaps to C (60) or D (62) in C minor
      const snapped = node.getOutput('snapped')
      if (snapped !== 60 && snapped !== 62) {
        throw new Error(`Expected snapped to 60 or 62, got ${snapped}`)
      }
    },
  },
])

const isRunningAll = ref(false)

const stats = ref({
  total: testCases.value.length,
  passed: 0,
  failed: 0,
  duration: 0,
})

async function runTestCase(tc: TestCase) {
  tc.status = 'running'
  tc.error = undefined
  const start = performance.now()
  try {
    await tc.run()
    tc.status = 'passed'
    tc.duration = Number((performance.now() - start).toFixed(2))
    telemetry.log('graph', `Test: ${tc.name}`, 'TestRunner', { duration: tc.duration, status: 'PASSED' })
  } catch (err: any) {
    tc.status = 'failed'
    tc.error = err?.message || String(err)
    tc.duration = Number((performance.now() - start).toFixed(2))
    telemetry.log('graph', `Test Failed: ${tc.name}`, 'TestRunner', { error: tc.error, status: 'FAILED' })
  }
}

async function runAllTests() {
  isRunningAll.value = true
  const totalStart = performance.now()
  let pass = 0
  let fail = 0

  for (const tc of testCases.value) {
    await runTestCase(tc)
    if (tc.status === 'passed') pass++
    else fail++
  }

  stats.value = {
    total: testCases.value.length,
    passed: pass,
    failed: fail,
    duration: Number((performance.now() - totalStart).toFixed(2)),
  }
  isRunningAll.value = false
}
</script>

<template>
  <div class="test-runner-container">
    <header class="test-runner-header">
      <div class="header-left">
        <h2>In-Browser Axon Test Suite</h2>
        <p>Run native unit &amp; reactive integration test suites directly in client memory without Node.js.</p>
      </div>

      <div class="header-actions">
        <button :disabled="isRunningAll" class="run-all-btn" @click="runAllTests">
          <span>{{ isRunningAll ? '⏳ Running Tests...' : '▶ Run All Test Suites' }}</span>
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-num">{{ testCases.length }}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-num">{{ testCases.filter((t) => t.status === 'passed').length }}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-num">{{ testCases.filter((t) => t.status === 'failed').length }}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ stats.duration }}ms</div>
        <div class="stat-label">Duration</div>
      </div>
    </div>

    <!-- Test List -->
    <div class="test-list-wrapper">
      <div class="test-list">
        <div
          v-for="tc in testCases"
          :key="tc.id"
          :class="['test-item', tc.status]"
        >
          <div class="test-status-icon">
            <span v-if="tc.status === 'idle'">○</span>
            <span v-else-if="tc.status === 'running'">◌</span>
            <span v-else-if="tc.status === 'passed'">✓</span>
            <span v-else-if="tc.status === 'failed'">✕</span>
          </div>

          <div class="test-info">
            <div class="test-meta">
              <span class="suite-tag">{{ tc.suite }}</span>
              <span class="test-name">{{ tc.name }}</span>
            </div>
            <div v-if="tc.error" class="test-error">
              Error: {{ tc.error }}
            </div>
          </div>

          <div class="test-timing">
            <span v-if="tc.duration !== undefined">{{ tc.duration }}ms</span>
            <button class="run-single-btn" :disabled="isRunningAll" @click="runTestCase(tc)">
              Run
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-runner-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2.618em 2em 6em 2em;
  box-sizing: border-box;
  overflow-y: auto;
}

.test-runner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2em;
  gap: 1em;
  flex-wrap: wrap;
}

.header-left h2 {
  margin: 0 0 0.4em 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--ui-color-text, #ffffff);
}

.header-left p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
}

.run-all-btn {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
  border: none;
  border-radius: var(--ui-radius-sm, 6px);
  padding: 0.6em 1.4em;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.run-all-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.run-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.236em;
  margin-bottom: 2em;
}

.stat-card {
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 1.236em;
  text-align: center;
}

.stat-num {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--ui-color-text, #ffffff);
}

.stat-card.passed .stat-num {
  color: oklch(0.7 0.2 145);
}

.stat-card.failed .stat-num {
  color: oklch(0.65 0.22 25);
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ui-color-text-muted, oklch(0.65 0.02 260));
  margin-top: 0.2em;
}

.test-list-wrapper {
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  overflow: hidden;
}

.test-list {
  display: flex;
  flex-direction: column;
}

.test-item {
  display: flex;
  align-items: center;
  gap: 1em;
  padding: 0.8em 1.236em;
  border-bottom: 1px solid var(--ui-color-border, oklch(0.2 0.02 260));
  transition: background 0.15s ease;
}

.test-item:last-child {
  border-bottom: none;
}

.test-item:hover {
  background: var(--ui-color-surface-hover, oklch(0.2 0.025 260));
}

.test-status-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--ui-color-text-muted, oklch(0.5 0.02 260));
}

.test-item.passed .test-status-icon {
  color: oklch(0.7 0.2 145);
}

.test-item.failed .test-status-icon {
  color: oklch(0.65 0.22 25);
}

.test-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}

.test-meta {
  display: flex;
  align-items: center;
  gap: 0.8em;
}

.suite-tag {
  font-size: 0.72rem;
  padding: 0.15em 0.5em;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border-radius: 4px;
  color: var(--ui-color-text-muted, oklch(0.7 0.02 260));
}

.test-name {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ui-color-text, #ffffff);
}

.test-error {
  font-size: 0.8rem;
  color: oklch(0.7 0.22 25);
  font-family: ui-monospace, monospace;
}

.test-timing {
  display: flex;
  align-items: center;
  gap: 0.8em;
  font-size: 0.75rem;
  color: var(--ui-color-text-muted, oklch(0.6 0.02 260));
}

.run-single-btn {
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 4px);
  color: var(--ui-color-text, #ffffff);
  padding: 0.2em 0.6em;
  font-size: 0.75rem;
  cursor: pointer;
}

.run-single-btn:hover {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
}
</style>
