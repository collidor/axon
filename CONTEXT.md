# Axon Audio Domain Glossary

This document establishes the canonical terminology and concepts for audio processing and algorithmic music generation within `@collidor/axon`.

---

### Core Concepts

- **Cycle**: The fundamental, continuous unit of musical time in Axon's transport engine. Represents one complete musical measure/loop ($[0.0, 1.0)$ in normalized cycle time).
- **CPS (Cycles Per Second)**: The tempo rate governing cycle speed ($CPS = \frac{BPM}{240}$ for 4-beat measures).
- **Arc**: A half-open rational time interval $[begin, end)$ representing a window of cyclic time.
- **Hap (Event)**: A discrete musical event that occurs within an Arc, consisting of a time span, duration, value (pitch/sample), velocity, and optional synthesis parameters.
- **AudioEvent**: The canonical `@collidor/struct` typed representation of a Hap passed through Axon graph ports.
- **Pattern**: A pure function from an Arc to an array of Haps: $f(Arc) \rightarrow Hap[]$.
- **Sequence & Parallel Pattern Composition**: Modular graph-based composition of musical events using pure `Sequence` and `Parallel` visual nodes without any string parsing or DSLs.

---

### Architecture & Engine Components

- **AudioClock / Transport**: The master scheduling engine that synchronizes Axon graph ticks with the Web Audio API's jitter-free hardware clock (`AudioContext.currentTime`).
- **Web Audio Driver**: The abstraction layer providing seamless Web Audio API interaction in browser environments while degrading gracefully to a zero-DOM `NullAudioContext` during headless execution and tests.
- **PolySynth**: A polyphonic subtractive synthesizer engine with configurable oscillator waveforms (sine, saw, square, triangle, noise), ADSR envelopes, and resonant biquad filters.
- **DrumSampler**: A dual-mode percussion engine providing built-in synthesized 808 instruments (kick, snare, hat, clap) and remote audio buffer sample loading.
- **Effects Chain**: A modular pipeline of audio DSP nodes (tempo-synced Delay, Reverb, Bitcrusher, Filter) terminating in a Master Output bus.

---

### Documentation & Showcase Architecture

- **Vue Vapor Mode**: The zero-Virtual-DOM compilation mode for Vue 3 that translates template components directly into fine-grained reactive DOM operations, providing ultra-low memory consumption and maximum execution speed for canvas and real-time audio interaction.
- **Showcase App / Docs Shell**: The standalone developer documentation and interactive demo application (following the `@collidor/toolkit-docs` structure) that showcases, documents, and provides live testing for the entire Axon system.
- **Vite Plus (`vp`)**: The unified bundler, test runner, and development server CLI (`vp dev`, `vp build`, `vp preview`) from VoidZero used to build and package both libraries and static web applications.
- **Interactive Node Sandbox Gallery**: Live modular playgrounds embedded in the docs to inspect, configure, and stress-test each node family (Math, Logic, Flow, Data Tables, Routing, Synthesis, Drums, Effects) in isolation.
- **In-Browser Test Dashboard**: An interactive test runner embedded in the documentation allowing users to run, visualize, and verify test suites in real-time.
- **DevTools Telemetry Dock**: A bottom collapsible dock providing real-time telemetry, command history, graph execution logs, and port value monitors.
- **GitHub Pages Deployment Pipeline**: The static asset compilation setup with base path management and GitHub Actions automated workflow for continuous deployment to GitHub Pages.
