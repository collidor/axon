# Ticket 023: Fix Studio IDE Web Audio Driver Sync and Audio Playback

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None
**Blocks**: None

---

## Question

Why was audio not audible in the Studio IDE tab when presets were loaded or when transport was started, and how do we ensure reliable Web Audio clock synchronization, context resume, and voice scheduling?

---

## Root Causes & Diagnosis

1. **Clock Desynchronization with AudioContext**:
   - `DefaultAudioTimeProvider` in `clock.engine.ts` fell back to `performance.now() / 1000 - startTime` if `_axonAudioContext` wasn't globally defined yet when the clock engine was constructed.
   - When user clicks Play or loads a preset, `AudioDriverManager.get().getContext()` initializes the browser `AudioContext`. If the clock's time reference is out of sync with `AudioContext.currentTime`, Web Audio calls (`setValueAtTime`, ADSR envelopes) schedule in the past or far in the future, causing audio dropouts or silence.
2. **Audio Graph Adjacency on Preset Load**:
   - When loading presets (`SetGraphCommand`), nodes are mounted to DOM, but Web Audio output connections must ensure audio nodes route to destination.
3. **Autoplay Policy / Context Resume**:
   - The user gesture (clicking Play or Preset) must trigger `AudioDriverManager.get().resume()`, which must directly sync the clock's time provider with the active `AudioContext.currentTime`.

---

## Requirements

1. Update `DefaultAudioTimeProvider` in `clock.engine.ts` to always query `AudioDriverManager.get().getContext().currentTime` dynamically.
2. In `axonStudio.component.ts`, when `toggleAudioPlay(true)` or `loadPreset()` is called:
   - Call `await AudioDriverManager.get().resume()`.
   - Update `clockNodes.forEach(n => n.engine?.setTimeProvider(...))` to ensure clock aligns with `AudioContext.currentTime`.
3. In `polySynth.engine.ts`, ensure voices check `ctx.currentTime` and schedule properly.
4. Verify audio playback works in headless mock environments as well as live browser runs.
