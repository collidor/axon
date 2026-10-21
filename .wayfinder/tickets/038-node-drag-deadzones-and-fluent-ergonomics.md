# Ticket 038 – Node Drag Deadzones, Container Event Filtering & Fluent Ergonomics

**Goal**: Eliminate node card drag deadzones, centralize interactive control event filtering in `AxonGraph`, and add fluent headless graph ergonomics.

## Requirements
1. **Node Card Dragging & Selection**:
   - In `AxonGraph`, allow dragging and selecting a node by clicking anywhere on the node card (`.node-header`, `.node-body`, `.audio-node-faceplate`, `.data-node-row`, etc.) EXCEPT when clicking on interactive controls (`input`, `select`, `textarea`, `button`, `a`, `[contenteditable="true"]`, `[data-interactive]`, or `<axon-port-in>` / `<axon-port-out>`).
2. **Container-Level Event Filtering**:
   - Centralize interactive control detection in `AxonGraph` (`isInteractiveControl(target)`) so node authors do not need to manually attach 6 `stopPropagation()` listeners to every `<input>` or `<select>`.
3. **Fluent Node & Graph Construction Ergonomics**:
   - Add `node.connect(outputPort, targetNode, inputPort)` and `graph.connect(sourceNode, outputPort, targetNode, inputPort)` helpers on `BaseNode` and `BaseGraph`.
   - Support optional `position?: { x: number; y: number }` metadata on `BaseNode` so headless graphs preserve layout coordinates during `serializeHeadlessGraph` / `graph.serialize()`.

## Acceptance Criteria
1. Clicking `.node-body` or `.audio-node-faceplate` selects and drags the node cleanly.
2. Interacting with `<input>`, `<select>`, `<textarea>`, or `<button>` inside a node never triggers node dragging or canvas panning.
3. Fluent `nodeA.connect('out', nodeB, 'in')` works in headless and DOM graphs.
4. All unit tests pass.
