# Ticket 013: Drum Sampler & Audio Effects Chain

**Labels**: `wayfinder:task`
**Status**: Closed (Resolved)
**Resolution**: Implemented `DrumSamplerNodeEngine` (synthesized 808 kick, snare, hi-hat, clap, cowbell + sample buffer caching) in `src/nodes/audio/drumSampler.engine.ts`. Implemented modular effects chain: `DelayNodeEngine` (tempo-synced stereo delay), `ReverbNodeEngine` (impulse response convolution), `BitcrusherNodeEngine` (quantizing wave shaper), and `MasterOutputNodeEngine` (master gain + AnalyserNode) in `src/nodes/audio/fx/`. Registered in `nodeLibrary.ts`. 7 unit tests passing in `src/nodes/audio/__tests__/drumsAndFx.spec.ts`.
**Blocked by**: Ticket 012
**Blocks**: Ticket 014

---

## Question

How do we implement a dual-mode drum engine (synthesized 808 percussion + audio sample buffer player) and modular audio effects nodes (Delay, Reverb, Bitcrusher, Master Output) in Axon?

---

## Requirements

1. **`DrumSamplerNodeEngine` (`src/nodes/audio/drumSampler.engine.ts`)**:
   - Synthesized Drum Models:
     - **Kick (808)**: Rapid pitch sweep sine wave ($150\text{Hz} \rightarrow 40\text{Hz}$) with fast punch click and exponential volume decay.
     - **Snare**: Dual layer consisting of pitched body oscillator ($180\text{Hz}$) + high-pass filtered white noise burst with snappy decay.
     - **Hi-Hat (Closed/Open)**: High-pass/band-pass filtered metallic noise with adjustable decay duration (closed ~40ms, open ~300ms).
     - **Clap**: Multiple rapid noise pulses mimicking group clapping handclaps.
   - Remote Sample Buffer Loader:
     - Asynchronously fetches audio samples from URLs (e.g. Strudel dirt-samples or user URLs) with in-memory caching.
   - Event Mapping:
     - Automatically recognizes Strudel sample names: `"bd"`, `"sd"`, `"hh"`, `"oh"`, `"cp"`, `"rim"`, `"cb"`.

2. **Audio Effects Pipeline Nodes (`src/nodes/audio/fx/`)**:
   - **`DelayNodeEngine`**:
     - Tempo-synced stereo ping-pong / stereo delay.
     - Parameters: `time` (fraction of beat e.g. `0.25`, `0.375`), `feedback` (`0.0..0.95`), `mix` (`0.0..1.0`).
   - **`ReverbNodeEngine`**:
     - Algorithmic Schroeder/Freeverb model or impulse response convolution reverb.
     - Parameters: `roomSize`, `damp`, `mix`.
   - **`BitcrusherNodeEngine`**:
     - AudioWorklet or Web Audio wave-shaping / sample-and-hold bit reduction (1 to 16 bits) and frequency downsampling.
     - Parameters: `bits`, `normfreq`, `mix`.
   - **`MasterOutputNodeEngine`**:
     - Master volume gain node, mute toggle, and Web Audio `AnalyserNode` tap for time-domain and frequency-domain visualizers.

3. **Testing**:
   - Unit tests in `src/nodes/audio/__tests__/drumsAndFx.spec.ts` testing drum parameter modulation, effects chain routing, and null driver safety.
