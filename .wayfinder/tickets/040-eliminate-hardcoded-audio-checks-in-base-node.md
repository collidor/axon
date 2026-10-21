# Ticket 040 – Eliminate Hardcoded Audio Port Checks in BaseNode via Generic Port Hooks

**Goal**: Remove all domain-specific `audioIn` / `connectAudioInput` string checks from `src/core/base.node.ts` and delegate them to node options or lifecycle hooks.

## Context & Problem
`BaseNode` is the generic foundation of the entire graph engine. In `src/core/base.node.ts`, lines 448 and 464 check `portName === 'audioIn'` and dynamically cast `this` to call `connectAudioInput(value)` and `disconnectAudioInput(removedValue)`. This leaks audio domain logic into the general-purpose graph core.

## Requirements
1. **Generic Port Hook Delegation**:
   - In `src/core/base.node.ts`, `notifyPortConnect` and `notifyPortDisconnect` must only invoke `this.#options.onPortConnect` and `this.#options.onPortDisconnect` (and optional protected virtual hooks `protected handlePortConnect(...)` / `protected handlePortDisconnect(...)`).
   - Remove `portName === 'audioIn'` and `(this as any).connectAudioInput` / `(this as any).disconnectAudioInput` from `BaseNode`.
2. **Audio Nodes Implementation**:
   - Audio nodes that manage audio stream connections (such as `masterOutput.engine.ts`, `delay.engine.ts`, `reverb.engine.ts`, etc.) should hook `onPortConnect` / `onPortDisconnect` via their node options or subclass methods.
3. **Unit Tests**:
   - Verify that all audio tests (`drumsAndFx.spec.ts`, `graphAudioRun.spec.ts`, `theoryNodesAndSumming.spec.ts`) pass without any regressions.

## Acceptance Criteria
- Zero occurrences of `'audioIn'`, `'connectAudioInput'`, or `'disconnectAudioInput'` in `src/core/base.node.ts`.
- All audio connections function identically.
- 100% test pass rate.
