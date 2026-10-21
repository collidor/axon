# Ticket 025: Fix Custom Element Tag Name Resolution & Registry in AxonGraph

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None

---

## Question

Why do registered node types such as `poly-synth` and `delay` fail to render in `<axon-graph>` when loaded from serialized graphs, leaving sequence nodes unconnected and orphan edges in the DOM?

---

## Root Causes & Diagnosis

1. **Tag Name Resolution Hardcoding**:
   - `resolveNodeTagName(type)` in `src/web-components/helpers.ts` performs mechanical string kebab-case prefixing:
     - `resolveNodeTagName('poly-synth')` checks `axon-poly-synth` and `axon-poly-synth-node`.
     - However, `TAG_NAMES.AXON_SYNTH_NODE` is `'axon-synth-node'`!
     - `nodeRegistry.get('poly-synth')?.component` is `'axon-synth-node'`.
     - `resolveNodeTagName` does NOT query `nodeRegistry` or provide alias mappings for engine node types.
   - Result: `<axon-poly-synth-node>` is created as an unregistered generic HTMLElement. It has no shadow DOM, no inner template, and no `<axon-port-in id="...:events">`.
2. **Missing Component / Port Failure Cascade**:
   - `AxonGraph.SetGraphCommand` and `AddNodeCommand` instantiate `<axon-poly-synth-node>` and `<axon-delay-node>`.
   - Because neither tag has custom element lifecycle or ports, `rebuildAdjacency()` and `draw()` cannot resolve the target ports (`lead-synth-1:events`, `lead-synth-1:audioOut`, `delay-fx-1:audioIn`).
   - Consequently, edges originating from `lead-seq-1:events` and `bass-seq-1:events` find no target port element, leaving the top sequence nodes visually unconnected.

---

## Requirements

1. In `src/web-components/helpers.ts`:
   - Import `nodeRegistry` from `../nodes/nodeLibrary`.
   - Update `resolveNodeTagName(type: string)` to check `nodeRegistry.get(type)?.component` first.
   - Provide explicit fallback aliases:
     - `'poly-synth' -> TAG_NAMES.AXON_SYNTH_NODE ('axon-synth-node')`
     - `'synth' -> TAG_NAMES.AXON_SYNTH_NODE`
     - `'delay' -> 'axon-delay-node'`
     - `'reverb' -> 'axon-reverb-node'`
     - `'bitcrusher' -> 'axon-bitcrusher-node'`
   - Define custom element alias: `customElements.define('axon-poly-synth-node', class extends AxonSynthNode {})` (or register the alias) to guarantee backward compatibility with serialized graphs.
2. In `src/web-components/axonGraph.component.ts`:
   - Verify `SetGraphCommand` correctly resolves all nodes via the updated `resolveNodeTagName`.
3. Add unit test verifying that `resolveNodeTagName('poly-synth')` resolves to `'axon-synth-node'` and creates an element with valid input ports.
