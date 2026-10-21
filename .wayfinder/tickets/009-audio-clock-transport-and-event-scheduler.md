# Ticket 009: Audio Clock, Transport & Event Scheduler

**Labels**: `wayfinder:task`
**Status**: Closed (Resolved)
**Resolution**: Implemented `AudioEventSchema`, `noteToFrequency`, `frequencyToMidi` in `src/nodes/audio/audio.types.ts`, and `AudioClockNodeEngine` / `createAudioClockNode` with ahead-of-time lookahead scheduling and pluggable time drivers (`DefaultAudioTimeProvider`, `MockAudioTimeProvider`) in `src/nodes/audio/clock.engine.ts`. Registered in `nodeLibrary.ts`. 9 unit tests passing in `src/nodes/audio/__tests__/clock.spec.ts`.
**Blocked by**: None
**Blocks**: Ticket 010, Ticket 011, Ticket 012

---

## Question

How do we provide jitter-free musical cycle timing, ahead-of-time Web Audio scheduling, and `@collidor/struct` typed `AudioEvent` streaming in Axon while maintaining zero-DOM headless testability?

---

## Requirements

1. **`AudioEvent` Schema (`@collidor/struct`)**:
   - Define canonical `AudioEventSchema` in `src/nodes/audio/audio.types.ts`:
     - `time`: number (AudioContext scheduled timestamp or cycle fractional offset)
     - `duration`: number (in seconds)
     - `note`: optional string (e.g., `'C4'`, `'Eb3'`, `'808_bd'`)
     - `freq`: optional number (in Hz)
     - `velocity`: number (default: `0.8`, range `0.0` - `1.0`)
     - `pan`: number (default: `0.0`, range `-1.0` - `1.0`)
     - `params`: optional record of parameters (e.g. `{ cutoff: 1200, decay: 0.2 }`)
   - Create helper `noteToFrequency(note: string): number` supporting scientific pitch notation and standard Strudel pitch aliases.

2. **`AudioClockNodeEngine` (`src/nodes/audio/clock.engine.ts`)**:
   - Node inputs:
     - `bpm`: number (default: 120, range 20-300)
     - `run`: boolean (default: true)
     - `reset`: boolean (pulse to reset cycle counter to 0)
     - `lookaheadMs`: number (scheduler lookahead window, default: 100ms)
   - Node outputs:
     - `cycle`: number (current integer cycle index)
     - `phase`: number (continuous fractional position in cycle `0.0` to `1.0`)
     - `cps`: number (cycles per second: `bpm / 240` assuming 4/4)
     - `tick`: boolean (pulse at start of each beat/step)
     - `time`: number (master audio clock time in seconds)

3. **Ahead-of-Time Scheduler**:
   - Implements Web Audio lookahead pattern (Chris Wilson / Strudel audio clock pattern):
     - Periodic interval tick (e.g. every 25ms) queries upcoming arc `[currentTime, currentTime + lookahead]`.
     - Dispatches scheduled events ahead of time to prevent audio glitches under main-thread load.

4. **Zero-DOM Headless Support**:
   - Pluggable clock driver: browser Web Audio `AudioContext.currentTime` when available, falling back to high-resolution `performance.now()` in Node.js/Vitest tests.
   - Comprehensive test suite in `src/nodes/audio/__tests__/clock.spec.ts`.
