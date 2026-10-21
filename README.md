# @collidor/axon

High-performance modular node graph and execution engine with zero-DOM headless execution and interactive Web Components.

## Features

- **Strict Zero-DOM Headless Mode**: Run graphs on Node.js, Web Workers, or server runtimes via `@collidor/axon/headless` with zero DOM dependencies.
- **Type-Safe Port Subtyping**: Native integration with `@collidor/struct` for type checking, schema validation, and port assignability.
- **Single-Input Port Rule**: Ports accept strictly one incoming connection; replacing connections cleanly triggers symmetric undo/redo history.
- **Interactive Web Components**: Self-contained inline node cards (`<axon-graph>`, `<axon-box>`, `<axon-port>`, `<axon-edge>`, `<axon-studio>`) without requiring external sidebars.
- **Web Audio & Music Theory**: Headless Web Audio driver, audio clock transport, polyphonic synthesizer, drum sampler, multi-channel mixer, and music theory nodes.
- **JIT Compilation**: Compile pure dataflow subgraphs directly to high-throughput JavaScript functions.

---

## Headless Programmatic Usage

You can build, execute, serialize, and deserialize graphs in Node.js or edge runtimes without any browser globals.

```typescript
import {
  BaseGraph,
  registerCoreNodes,
  nodeRegistry,
  NODE_TYPES,
  serializeHeadlessGraph,
  loadHeadlessGraph,
} from '@collidor/axon/headless'

// 1. Register core node engines
registerCoreNodes()

// 2. Instantiate headless graph
const graph = new BaseGraph()

const mathDef = nodeRegistry.get(NODE_TYPES.MATH)!

// 3. Add node engines
const adder = mathDef.createEngine!({
  id: 'adder',
  initialData: { a: 10, b: 20, operator: 'ADD' },
})
adder.position = { x: 50, y: 100 }
graph.addNode(adder)

const multiplier = mathDef.createEngine!({
  id: 'multiplier',
  initialData: { b: 2, operator: 'MULTIPLY' },
})
multiplier.position = { x: 250, y: 100 }
graph.addNode(multiplier)

// 4. Wire ports: adder output -> multiplier input
graph.addEdge('adder:result', 'multiplier:a')

// 5. Execute and settle reactive pipeline
await graph.settle()
console.log(multiplier.getOutput('result')) // 60

// 6. Serialize graph to JSON-safe data structure
const serialized = serializeHeadlessGraph(graph)
const jsonString = JSON.stringify(serialized)

// 7. Deserialize back into a runnable graph
const restoredGraph = BaseGraph.deserializeHeadlessGraph(JSON.parse(jsonString))
await restoredGraph.settle()
```

---

## Web Components & Visual Graph

Import the full bundle or style to use `<axon-graph>` and `<axon-studio>` in HTML:

```html
<script type="module" src="@collidor/axon"></script>
<link rel="stylesheet" href="@collidor/axon/style.css" />

<axon-studio></axon-studio>
```

Or programmatically mount `<axon-graph>`:

```typescript
import '@collidor/axon'

const graphEl = document.createElement('axon-graph')
document.body.appendChild(graphEl)

graphEl.addNode({
  type: 'math',
  x: 100,
  y: 100,
  data: { operator: 'ADD', a: 5, b: 15 },
})
```

---

## Architecture

- `src/core/`: Headless graph runtime (`BaseGraph`, `BaseNode`, `nodeRegistry`, `serialization.ts`). Strictly zero-DOM.
- `src/nodes/`: Headless node engines (math, logic, clock, feedback, data, audio). Strictly zero-DOM.
- `src/compiler/`: Graph-to-code compiler and JIT optimizer. Strictly zero-DOM.
- `src/web-components/`: Custom Elements for visual graph rendering, interactive handles, inline controls, and audio FX visualization.
- `src/headless.ts`: Headless entry point (`@collidor/axon/headless`).
