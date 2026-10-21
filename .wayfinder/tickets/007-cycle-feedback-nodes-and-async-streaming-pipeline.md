# Cycle Feedback Nodes and Async Streaming Pipeline

`wayfinder:task`
Status: Complete

## Question

How should Axon handle intentional recursive feedback loops (e.g. game loops, state accumulation) and visualize asynchronous streaming node execution without blocking the UI thread?

## Context

Kahn's topological sort breaks cycles defensively to avoid infinite recursion. However, in simulations, reactive state machines, and audio pipelines, feedback loops with explicit delay or memory (such as a `LatchNode`, `DelayNode`, or `AccumulatorNode`) are required.

Furthermore, async nodes (e.g. `dbPut`, HTTP fetch, slow AI logic) need streaming status reporting (`isPending`, `progress`, `error`, `success`) and edge pulse animations while data is in flight.

## Implementation Details

1. **Feedback & Delay Engine (`FeedbackNodeEngine`, `createFeedbackNode`, `createDelayNode`)**:
   - Implemented Z⁻¹ unit delay latch with `input`, `initial`, `step`, `reset` inputs and `output`, `previous` outputs.
   - Values are latched synchronously into `nextValue` without advancing `currentValue` until discrete `step()` tick or clock pulse arrives.
   - Direct cycles are defensively capped in `BaseGraph.flush()` with `maxIterations: 100` and `MAX_RECURSION_DEPTH: 100`.
   - `BaseGraph.step()` advances all feedback nodes across tick boundaries.
2. **Standardized BaseNode Async Streaming Lifecycle**:
   - Added `NodeExecutionStatus` (`'idle' | 'running' | 'resolved' | 'rejected'`).
   - Added `executeAsync()`, `setStatus()`, `status`, `progress`, `lastError`, and `subscribeStatus()` to `BaseNode`.
3. **Web Component Integration (`<axon-feedback-node>`)**:
   - Created `<axon-feedback-node>` with live monitor panel (`Current`, `Staged Next`, `Cycle Count`), interactive step/reset action buttons, and full port synchronization.
   - `AxonBaseNodeElement` subscribes to status transitions and reflects `data-status`, `.status-running`, `.is-streaming`.
   - CSS styling in `axon.css` provides ambient cyan/emerald glowing pulses for running nodes and streaming edge dash animations.
   - Added Feedback Latch to `<axon-studio>` palette and preset library.
4. **Verification**:
   - 11/11 tests passing in `src/nodes/__tests__/feedback.node.spec.ts`.
   - All 37 test suites (229 tests) passing across `@collidor/axon`.
   - Clean `tsc --noEmit` compilation.
