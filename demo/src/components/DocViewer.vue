<script setup lang="ts">
import { ref } from "vue";
import CodeBlock from "./CodeBlock.vue";
import Callout from "./Callout.vue";
import { BaseGraph, createMathNode } from "@collidor/axon";
import { s } from "@collidor/struct";

const emit = defineEmits(['launchStudio', 'launchMusic', 'launchGallery']);

const liveOutputs = ref<Record<string, string>>({});

function setOutput(key: string, val: string) {
  liveOutputs.value = { ...liveOutputs.value, [key]: val };
}

// Interactive Live Example: Mini Graph Evaluation
async function runMathGraph() {
  const graph = new BaseGraph();
  
  // Create MathNode A (10 + 25)
  const addNode = createMathNode();
  addNode.id = 'math-add';
  
  // Create MathNode B (sum * 3)
  const mulNode = createMathNode();
  mulNode.id = 'math-mul';
  mulNode.setInput('operator', 'MULTIPLY');
  
  graph.addNode(addNode);
  graph.addNode(mulNode);
  
  // Set initial inputs
  addNode.setInput('a', 10);
  addNode.setInput('b', 25);
  mulNode.setInput('b', 3);
  
  // Connect addNode:result -> mulNode:a
  graph.connect('math-add:result', 'math-mul:a');
  
  // Wait for reactive propagation
  await Promise.resolve();
  
  const addOut = addNode.getOutput('result');
  const mulOut = mulNode.getOutput('result');
  
  const text = `Math Pipeline Result: (10 + 25) * 3 = ${mulOut} (Add sum: ${addOut})`;
  setOutput("math-graph", text);
}

// Interactive Live Example: Struct Type-Checking
function runTypeCheck() {
  const numSchema = s.number();
  const strSchema = s.string();
  
  const numCheck = numSchema["~standard"].validate(42);
  const strCheck = numSchema["~standard"].validate("hello");
  
  const text = `Type-Safe Port Check:
• Validating 42 against s.number(): ${JSON.stringify(numCheck)}
• Validating "hello" against s.number(): ${JSON.stringify(strCheck)}`;
  setOutput("type-check", text);
}
</script>

<template>
  <div class="doc-viewer">
    <!-- 1. Overview -->
    <section id="overview" class="doc-section">
      <div class="doc-header">
        <h1 class="doc-title">Axon Architecture & Engine Guide</h1>
        <div class="doc-badges">
          <span class="ui-badge ui-badge--primary">Axon v0.1.0</span>
          <span class="ui-badge ui-badge--accent">Reactive Visual DAG</span>
          <span class="ui-badge ui-badge--success">Zero VDOM Vapor</span>
        </div>
      </div>
      <p class="doc-lead">
        <strong>@collidor/axon</strong> is a high-performance, reactive visual programming environment and DAG execution engine for modern TypeScript and Web Applications.
        It features type-safe edge connections via <code>@collidor/struct</code>, topological scheduling, loop-aware feedback accumulators, isolated subgraphs, live Strudel algorithmic music synthesis, and zero-runtime pure TypeScript graph compilation.
      </p>

      <Callout type="info" title="Zero Virtual-DOM & Custom Elements Architecture">
        Axon delivers zero-overhead rendering by implementing native Web Components (<code>&lt;axon-canvas&gt;</code>, <code>&lt;axon-node&gt;</code>, <code>&lt;axon-studio&gt;</code>) paired with an independent, headless execution engine (<code>GraphRuntime</code>). It can run headlessly in Node.js/workers or visually in any frontend framework.
      </Callout>
    </section>

    <!-- 2. Quickstart -->
    <section id="quickstart" class="doc-section">
      <h2 class="doc-section-title">Quickstart & Installation</h2>
      <p>Install Axon and its peer dependencies via pnpm or npm:</p>
      
      <CodeBlock
        language="bash"
        code="pnpm add @collidor/axon @collidor/struct @collidor/command @collidor/ui"
      />

      <p>Instantiate a graph runtime, register nodes, connect ports, and execute:</p>

      <CodeBlock
        language="typescript"
        code="import { createGraphRuntime } from '@collidor/axon';

// 1. Create runtime instance
const runtime = createGraphRuntime();

// 2. Add nodes
const add = runtime.addNode('math.add');
const multiply = runtime.addNode('math.multiply');

// 3. Connect ports
runtime.connect({
  fromNodeId: add.id,
  fromPortId: 'sum',
  toNodeId: multiply.id,
  toPortId: 'a',
});

// 4. Set inputs & evaluate
runtime.setInputValue(add.id, 'a', 10);
runtime.setInputValue(add.id, 'b', 25);
runtime.setInputValue(multiply.id, 'b', 3);

await runtime.step();
console.log(runtime.getNodeOutput(multiply.id, 'product')); // => 105"
      />

      <div class="interactive-sandbox">
        <div class="sandbox-header">
          <span class="sandbox-title">Interactive Quickstart Live Demo</span>
          <button class="run-btn" @click="runMathGraph">Execute Math Pipeline</button>
        </div>
        <div v-if="liveOutputs['math-graph']" class="sandbox-output">
          {{ liveOutputs['math-graph'] }}
        </div>
      </div>
    </section>

    <!-- 3. Core Architecture -->
    <section id="architecture" class="doc-section">
      <h2 class="doc-section-title">Core Architecture & Design</h2>
      <p>
        Axon separates state, evaluation, and visual representation into clean decoupled layers:
      </p>
      
      <div class="diagram-container">
        <div class="ascii-diagram">
┌────────────────────────────────────────────────────────┐
│                      Axon Studio UI                    │
│    &lt;axon-graph&gt;    &lt;axon-box&gt;    &lt;axon-port&gt;       │
└───────────────────────────┬────────────────────────────┘
                            │ Dispatches Commands / Actions
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Invertible Command Bus               │
│        AddNode | RemoveEdge | MoveNode | SetInput      │
│                 (Full Undo / Redo Stack)               │
└───────────────────────────┬────────────────────────────┘
                            │ Mutates
                            ▼
┌────────────────────────────────────────────────────────┐
│                 GraphRuntime Engine (DAG)              │
│  Topological Sorter | Reactive Signals | Subgraph Tree │
└─────────────┬────────────────────────────┬─────────────┘
              │ Evaluates                  │ Emits
              ▼                            ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│      Audio Engine         │ │ Pure TypeScript Compiler │
│ Clock | Mini-Notation     │ │ Generates executable TS  │
│ PolySynth | 808 | Effects │ │ without graph overhead   │
└───────────────────────────┘ └──────────────────────────┘
        </div>
      </div>

      <div class="feature-grid">
        <div class="feature-card">
          <h4>Topological Scheduler</h4>
          <p>Kahn's algorithm detects circular cycles and schedules nodes in exact dependency order with O(V + E) complexity.</p>
        </div>
        <div class="feature-card">
          <h4>Subtyping Verification</h4>
          <p>Edges validate connection type compatibility using <code>@collidor/struct</code> subtyping before allowing cables.</p>
        </div>
        <div class="feature-card">
          <h4>Feedback Accumulators</h4>
          <p>Cycle breaking with explicit 1-frame delayed state buffers enables DSP accumulators, counters, and oscillators.</p>
        </div>
        <div class="feature-card">
          <h4>Pure TS Codegen</h4>
          <p>Compile visual node logic directly into standalone TypeScript functions with zero engine bundle footprint.</p>
        </div>
      </div>
    </section>

    <!-- 4. Graph Runtime -->
    <section id="graph-runtime" class="doc-section">
      <h2 class="doc-section-title">Graph Runtime Engine</h2>
      <p>
        Nodes are defined using <code>defineNode</code> with explicit input/output port definitions, schema contracts, and async or sync compute functions:
      </p>

      <CodeBlock
        language="typescript"
        code="import { defineNode } from '@collidor/axon';
import { s } from '@collidor/struct';

export const CustomFilterNode = defineNode({
  type: 'filter.threshold',
  label: 'Threshold Filter',
  inputs: {
    value: { type: s.number(), default: 0 },
    threshold: { type: s.number(), default: 50 },
  },
  outputs: {
    passed: { type: s.boolean() },
    clamped: { type: s.number() },
  },
  compute({ inputs }) {
    const passed = inputs.value >= inputs.threshold;
    return {
      passed,
      clamped: passed ? inputs.value : inputs.threshold,
    };
  },
});"
      />
    </section>

    <!-- 5. Reactive Signals -->
    <section id="reactive-signals" class="doc-section">
      <h2 class="doc-section-title">Reactive Signal Propagation</h2>
      <p>
        Whenever an input port receives a new value or a dirty flag is raised, Axon marks dependent downstream nodes as dirty. Only affected subtrees are evaluated, avoiding wasteful whole-graph recalculation.
      </p>
    </section>

    <!-- 6. Type-Safe Ports -->
    <section id="type-safe-ports" class="doc-section">
      <h2 class="doc-section-title">Port Schema & Struct Subtyping</h2>
      <p>
        Axon port typing integrates directly with <code>@collidor/struct</code> Standard Schema contracts.
        A connection from output port A to input port B is allowed only if type A is assignable to type B (covariance on outputs, contravariance on inputs).
      </p>

      <div class="interactive-sandbox">
        <div class="sandbox-header">
          <span class="sandbox-title">Test Struct Port Compatibility</span>
          <button class="run-btn" @click="runTypeCheck">Validate Types</button>
        </div>
        <pre v-if="liveOutputs['type-check']" class="sandbox-output">{{ liveOutputs['type-check'] }}</pre>
      </div>
    </section>

    <!-- 7. Feedback Loops -->
    <section id="feedback-loops" class="doc-section">
      <h2 class="doc-section-title">Feedback Loops & Clocks</h2>
      <p>
        While standard DAG engines reject cycles, dynamic DSP and state machines require feedback. Axon introduces <code>feedback.delay</code> nodes that store the prior frame's value and inject it at the start of the next evaluation step.
      </p>
    </section>

    <!-- 8. Subgraphs -->
    <section id="subgraphs" class="doc-section">
      <h2 class="doc-section-title">Subgraphs & Scope Isolation</h2>
      <p>
        Complex diagrams can be encapsulated into Subgraphs. An <code>axon.subgraph</code> node acts like a black box with exposed input/output ports mapped to inner passthrough nodes, with full drill-down breadcrumb navigation in the Studio IDE.
      </p>
    </section>

    <!-- 9. Algorithmic Music & Sequence Engine -->
    <section id="node-sequencing" class="doc-section">
      <h2 class="doc-section-title">Pure Node Algorithmic Music & Polyphony</h2>
      <p>
        Axon provides pure graph-based algorithmic music sequencing without string parsing or mini-notation DSLs:
      </p>
      <ul class="doc-list">
        <li><strong>Sequence Node:</strong> Subdivides each clock cycle evenly across an array of musical notes or drum hits (with rest support).</li>
        <li><strong>Parallel Node:</strong> Merges multiple child branches and voice layers concurrently for chords, polyphony, and drum stacks.</li>
        <li><strong>Musical Theory:</strong> Euclidean rhythm generator (Bjorklund algorithm), Chord generator, and Scale Quantizer.</li>
      </ul>

      <div class="cta-banner">
        <span>Want to experience live algorithmic music creation in the visual editor?</span>
        <button class="cta-btn" @click="emit('launchMusic')">Open Music Station</button>
      </div>
    </section>

    <!-- 10. Web Components -->
    <section id="web-components" class="doc-section">
      <h2 class="doc-section-title">Web Component Suite</h2>
      <p>
        The visual editor is packaged as zero-dependency Autonomous Custom Elements:
      </p>
      <ul class="doc-list">
        <li><code>&lt;axon-graph&gt;</code>: Infinite pan/zoom canvas with grid rendering, drag-select, and cubic bezier cable physics.</li>
        <li><code>&lt;axon-box&gt;</code>: Autonomous custom element base with inline controls, interactive form inputs, and port handles.</li>
        <li><code>&lt;axon-port-in&gt; / &lt;axon-port-out&gt;</code>: Reactive port handles with type checking and cubic bezier cable anchoring.</li>
        <li><code>&lt;axon-studio&gt;</code>: Full-featured IDE embedding canvas, inline node faceplates, node library drawer, and audio transport bar.</li>
      </ul>
    </section>

    <!-- 11. TypeScript Compiler -->
    <section id="graph-compiler" class="doc-section">
      <h2 class="doc-section-title">Pure TypeScript Graph Compiler</h2>
      <p>
        Axon can compile any visual graph into standalone, strongly-typed TypeScript code. The generated output has <strong>zero runtime dependency on Axon</strong> and executes at native JS speed!
      </p>

      <CodeBlock
        language="typescript"
        code="import { compileGraphToTypeScript } from '@collidor/axon';

const tsCode = compileGraphToTypeScript(graph, {
  functionName: 'computePipeline',
  exportType: 'named',
});

// Produces:
// export function computePipeline(inputs: { a: number, b: number }): { sum: number } {
//   const node_1 = inputs.a + inputs.b;
//   return { sum: node_1 };
// }"
      />

      <div class="cta-banner">
        <span>Explore the full interactive visual IDE:</span>
        <button class="cta-btn" @click="emit('launchStudio')">Launch Studio IDE</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.doc-viewer {
  flex: 1;
  max-width: 960px;
  padding: 2.618em 3em 5em 3em;
  margin: 0 auto;
  box-sizing: border-box;
}

.doc-section {
  margin-bottom: 3.618em;
  scroll-margin-top: 80px;
}

.doc-header {
  margin-bottom: 1.618em;
}

.doc-title {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ui-color-text, #ffffff);
  margin: 0 0 0.618em 0;
}

.doc-badges {
  display: flex;
  gap: 0.618em;
  flex-wrap: wrap;
}

.doc-lead {
  font-size: 1.15rem;
  line-height: 1.618;
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
  margin-bottom: 1.618em;
}

.doc-section-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ui-color-text, #ffffff);
  margin: 0 0 1em 0;
  border-bottom: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  padding-bottom: 0.4em;
}

.doc-list {
  padding-left: 1.5em;
  line-height: 1.8;
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
}

.diagram-container {
  background: var(--ui-color-surface, oklch(0.14 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 1.618em;
  margin: 1.618em 0;
  overflow-x: auto;
}

.ascii-diagram {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.35;
  color: var(--ui-color-primary, oklch(0.75 0.22 260));
  white-space: pre;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.236em;
  margin: 1.618em 0;
}

.feature-card {
  background: var(--ui-color-surface-elevated, oklch(0.18 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 1.236em;
}

.feature-card h4 {
  margin: 0 0 0.5em 0;
  font-size: 1rem;
  color: var(--ui-color-text, #ffffff);
}

.feature-card p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-color-text-muted, oklch(0.75 0.02 260));
}

.interactive-sandbox {
  margin: 1.618em 0;
  background: var(--ui-color-surface, oklch(0.14 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 1.236em;
}

.sandbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8em;
}

.sandbox-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ui-color-text, #ffffff);
}

.run-btn {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
  border: none;
  border-radius: var(--ui-radius-sm, 6px);
  padding: 0.45em 0.9em;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.run-btn:hover {
  opacity: 0.9;
}

.sandbox-output {
  margin-top: 0.8em;
  padding: 0.8em;
  background: var(--ui-color-surface-elevated, oklch(0.18 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  color: var(--ui-color-accent, oklch(0.75 0.22 150));
  white-space: pre-wrap;
}

.cta-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1em;
  background: color-mix(in oklch, var(--ui-color-primary, oklch(0.65 0.22 260)) 15%, transparent);
  border: 1px solid var(--ui-color-primary, oklch(0.65 0.22 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 1.236em 1.618em;
  margin: 1.618em 0;
  font-size: 0.95rem;
  color: var(--ui-color-text, #ffffff);
}

.cta-btn {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
  border: none;
  border-radius: var(--ui-radius-sm, 6px);
  padding: 0.5em 1em;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .doc-viewer {
    padding: 1.618em 1em;
  }
  .cta-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
