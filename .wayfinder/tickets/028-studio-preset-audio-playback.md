# Ticket 028: Studio Preset Audio Playback & Imperial March Graph Alignment

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None

---

## Question

Why does audio fail to play when loading the Imperial March preset in Axon Studio, and why are sequence nodes left unconnected on the canvas?

---

## Root Causes & Diagnosis

1. **Dependency on Tickets 025, 026, and 027**:
   - `poly-synth` tag was not resolved -> `lead-synth-1` and `bass-synth-1` never rendered.
   - `delay` component did not exist -> `delay-fx-1` never rendered.
   - `master-out-1:audioIn` only allowed 1 connection -> multiple audio lines could not sum.
   - When nodes are missing, edges cannot connect, leaving `lead-seq-1` and `bass-seq-1` dangling.
2. **Preset Graph Coordinates and Edge Definitions**:
   - Node coordinates need clean multi-column alignment:
     - Col 0 (x: 40): Audio Clock
     - Col 1 (x: 340): Lead Seq, Bass Seq, Drum Seq
     - Col 2 (x: 680): Lead Synth, Bass Synth, Drum Sampler
     - Col 3 (x: 1020): Delay FX
     - Col 4 (x: 1360): Master Output
   - Transport play button must start AudioClock, resume Web Audio context, and propagate clock events to trigger note events into synths and audio out.
3. **Tab Isolation & Audio Context State**:
   - Prevent autoplay on preset load; require user to click "▶ Audio" or "▶ Play Theme".
   - Cleanly suspend/stop audio when switching tabs between Studio, Music Station, and Docs to prevent tab conflicts or background noise.

---

## Requirements

1. Verify `imperial-march` preset in `axonStudio.component.ts` and `demo/src/presets.ts`:
   - All 9 nodes instantiate registered custom elements with valid ports.
   - All 10 edges connect cleanly without dangling or lingering (0, 0) edges.
2. Verify transport controls:
   - "▶ Audio" in Studio toolbar starts clock and triggers audio synthesis.
   - Oscilloscope in Master Output visualizes the audio signal.
3. Test in Vitest suite and verify browser build.
