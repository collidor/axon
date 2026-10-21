# Ticket 014: Interactive Audio Web Components & Studio Transport

**Labels**: `wayfinder:prototype`
**Status**: Closed
**Blocked by**: None
**Blocks**: None (Destination Hand-off)

---

## Question

How do we present the audio engine in Axon's visual canvas (`<axon-graph>`) and studio environment (`<axon-studio>`) with Eurorack-grade interactive controls, playhead indicators, oscilloscope visualizers, and a master transport bar?

---

## Requirements

1. **Custom Audio Web Components (`src/web-components/nodes/audio/`)**:
   - `<axon-mini-notation-node>`:
     - Live editable text field for mini-notation.
     - Visual pulse / animated glowing playhead highlight indicating active cycle step.
   - `<axon-step-sequencer-node>`:
     - 16 interactive LED step buttons with click-to-toggle activation and pitch slider popover.
     - Running playhead sweep synchronized with cycle clock.
   - `<axon-synth-node>`:
     - Interactive SVG/Canvas ADSR envelope visualizer displaying attack/decay/sustain/release curves.
     - Cutoff frequency & resonance interactive slider handles.
   - `<axon-master-output-node>`:
     - Real-time `<canvas>` oscilloscope showing waveform and peak volume meters (VU meter).
     - Master volume knob / fader and mute toggle.

2. **Studio Audio Transport Bar in `<axon-studio>`**:
   - Extend `<axon-studio>` toolbar with:
     - **Play / Pause / Stop** buttons with keyboard shortcuts (`Space` to toggle play/pause).
     - **BPM control** (number input and tap tempo button).
     - **Cycle counter** (`001.2.4`) displaying current cycle and beat position.
     - **Master Audio Enable / Unlock** indicator responding to browser audio autoplay policy.

3. **Strudel Preset Graph in `<axon-studio>`**:
   - Create a pre-built example audio graph preset in `<axon-studio>` presets:
     - Mini-notation drum beat (`"bd [~ bd] [sd, cp] [hh*4]"`) $\rightarrow$ DrumSampler.
     - Euclidean bassline (`"<c2 g2 eb2 bb1>"` with `euclid(3,8)`) $\rightarrow$ PolySynth (saw + LPF).
     - Arpeggiated melody with delay and reverb $\rightarrow$ Master Output.
   - One-click "Load Strudel Demo" in Studio presets to immediately hear live music.

4. **Testing & Parity**:
   - Web component interaction tests in `src/web-components/__tests__/audioNodes.spec.ts`.
