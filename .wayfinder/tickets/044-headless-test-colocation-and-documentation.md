# Ticket 044 – Headless Test Co-location, Decoupling & Documentation
Status: COMPLETED

**Goal**: Enforce strict zero-DOM test co-location, eliminate global audio state coupling, and add dedicated headless serialization tests and documentation.

## Context & Problem
1. `src/nodes/__tests__/` contains DOM tests (`document.createElement`) testing custom Web Component elements (`<axon-feedback-node>`, `<axon-type-convert-node>`, `<axon-uml-table-node>`), blurring the boundary between pure headless nodes and visual components.
2. `audioDriver.ts` and `clock.engine.ts` read and write an untyped global `_axonAudioContext` on `globalThis`.
3. Root `README.md` is missing `serializeHeadlessGraph()` and `BaseGraph.deserializeHeadlessGraph()` documentation, and a standalone `headless-serialization.test.ts` test file was requested in Ticket 034.

## Requirements
1. **Relocate Web Component Tests**:
   - Extract visual web-component tests from `src/nodes/__tests__/` to `src/web-components/__tests__/nodeComponents.spec.ts` (or co-locate with visual component tests).
   - Ensure `src/nodes/__tests__/` contains strictly zero-DOM unit tests.
2. **Decouple Global Audio State**:
   - In `src/nodes/audio/driver/audioDriver.ts` and `clock.engine.ts`, replace `(globalThis as any)._axonAudioContext` with `AudioDriverManager.getInstance().getContext()`.
3. **Headless Documentation & Dedicated Spec**:
   - Create `src/__tests__/headless-serialization.test.ts` validating building, serializing, saving to JSON, and deserializing pure headless graphs with layout coordinates and port values.
   - Update `README.md` with headless usage examples.

## Acceptance Criteria
- `src/nodes/__tests__/` has zero `document.createElement` references.
- `_axonAudioContext` is eliminated from `globalThis`.
- `headless-serialization.test.ts` passes.
- `README.md` documents headless serialization.
