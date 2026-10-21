# Ticket 033: Visual Music Theory Components, Display Escaping & Multi-Input Audio Summing

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None

---

## Question

How can Axon provide full visual custom element parity for all music theory nodes (`<axon-euclidean-node>`, `<axon-scale-quantizer-node>`, `<axon-chord-node>`, `<axon-arpeggiator-node>`), ensure zero DOM XSS injection in display nodes, and support simultaneous multi-input audio summing into downstream audio ports like `master:audioIn`?

---

## Root Causes & Diagnosis

1. **Missing Visual Web Components for Music Theory**:
   - `euclidean`, `scaleQuantizer`, `chord`, and `arpeggiator` engines were defined headlessly, but lacked dedicated visual custom element implementations in `src/web-components/nodes/audio/`.
2. **HTML Injection in DisplayNode**:
   - `AxonDisplayNode` rendered values via unescaped string concatenation into innerHTML without sanitization.
3. **Multi-Input Audio Summing**:
   - `BaseGraph` enforced single-incoming edge on all input ports. Summing junctions such as `master:audioIn` require multiple parallel inputs without overwriting connections or dropping audio bus connections.

---

## Solution

1. Implemented visual custom elements with interactive controls:
   - `<axon-euclidean-node>` with steps/pulses/rotation controls.
   - `<axon-scale-quantizer-node>` with root and scale selection.
   - `<axon-chord-node>` with voicing and octave selectors.
   - `<axon-arpeggiator-node>` with mode, octave, and gate controls.
2. Registered all 4 components into `nodeRegistry` and exported via `src/web-components/nodes/index.ts`.
3. Sanitized dynamic HTML rendering in `AxonDisplayNode` via `escapeHtml()`.
4. Enhanced `BaseGraph` to recognize multi-input ports (`audioIn`, `events`), allowing multiple incoming connections in `#adjacencyMap`, triggering `connectAudioInput()` on target nodes on edge addition, and disconnecting only the targeted source bus on edge removal.
5. Added comprehensive test suite `src/web-components/__tests__/theoryNodesAndSumming.spec.ts`.
