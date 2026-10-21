# Ticket 012: Headless Web Audio Driver & PolySynth Engine

**Labels**: `wayfinder:task`
**Status**: Closed (Resolved)
**Resolution**: Implemented `AudioDriverManager` with `NullAudioContext` mock driver for headless zero-DOM test execution and browser Web Audio API attachment in `src/nodes/audio/driver/audioDriver.ts`. Implemented 16-voice polyphonic subtractive synth `PolySynthNodeEngine` / `createPolySynthNode` with ADSR envelopes, resonant biquad filtering, stereo panning, and audio bus output routing in `src/nodes/audio/polySynth.engine.ts`. Registered in `nodeLibrary.ts`. 6 unit tests passing in `src/nodes/audio/__tests__/polySynth.spec.ts`.
**Blocked by**: Ticket 009
**Blocks**: Ticket 013, Ticket 014

---

## Question

How do we design a zero-DOM compatible Web Audio manager and a versatile polyphonic subtractive synthesizer node (`PolySynthNodeEngine`) with ADSR envelopes and resonant filtering that works headlessly in tests and produces rich real-time audio in the browser?

---

## Requirements

1. **Web Audio Driver & Context Manager (`src/nodes/audio/driver/`)**:
   - `AudioDriverManager`:
     - Lazily initializes `AudioContext` upon first user interaction or explicit start.
     - Handles browser autoplay policy (`state === 'suspended'` $\rightarrow$ `resume()`).
     - Provides `NullAudioContext` / mock nodes when running in Node.js, Vitest, or Web Worker environments without DOM globals.
     - Exposes master routing node (`destination`).

2. **Polyphonic Voice Architecture**:
   - Pool of reusable synthesizer voices (e.g. 16 voices with LRU voice stealing).
   - Each voice consists of:
     - Oscillator (`sine`, `square`, `sawtooth`, `triangle`, custom wavetable / white noise buffer).
     - ADSR Envelope generator modulating voice gain.
     - Resonant Biquad Filter (LPF/HPF/BPF with cutoff frequency and resonance Q) with dedicated filter envelope amount.
     - Stereo panner node.

3. **`PolySynthNodeEngine` (`src/nodes/audio/polySynth.engine.ts`)**:
   - Inputs:
     - `events`: `AudioEvent[]` (batched scheduled notes from mini-notation / patterns)
     - `trigger`: boolean (instant trigger for manual/step input)
     - `note`: string | number (instant note or frequency)
     - `waveform`: `'sawtooth'` | `'square'` | `'sine'` | `'triangle'` | `'noise'`
     - `attack`: number (seconds, e.g. 0.01)
     - `decay`: number (seconds, e.g. 0.2)
     - `sustain`: number (amplitude ratio 0.0 - 1.0, e.g. 0.5)
     - `release`: number (seconds, e.g. 0.4)
     - `cutoff`: number (Hz, e.g. 2000)
     - `resonance`: number (Q, e.g. 3.0)
     - `filterEnv`: number (filter envelope intensity)
   - Outputs:
     - `audioOut`: string (internal audio bus connection ID)
     - `activeVoices`: number (current number of sounding voices)
     - `lastEvent`: `AudioEvent`

4. **Testing**:
   - Headless test suite in `src/nodes/audio/__tests__/polySynth.spec.ts` verifying voice allocation, envelope calculations, parameter updates, and null driver safety.
