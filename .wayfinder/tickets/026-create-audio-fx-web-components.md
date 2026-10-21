# Ticket 026: Create Audio FX Web Components (Delay, Reverb, Bitcrusher)

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None

---

## Question

Why are audio effect nodes (Delay, Reverb, Bitcrusher) present in the core audio engine (`src/nodes/audio/fx/`) but missing corresponding Web Component custom elements, causing FX nodes in graphs to fail rendering?

---

## Root Causes & Diagnosis

1. In `src/nodes/audio/fx/`:
   - `delay.engine.ts`, `reverb.engine.ts`, and `bitcrusher.engine.ts` exist with full Web Audio graph implementations.
2. In `src/web-components/nodes/audio/`:
   - Only `audioClockNode`, `sequenceNode`, `parallelNode`, `stepSequencerNode`, `synthNode`, `drumSamplerNode`, and `masterOutputNode` are implemented as custom elements.
   - There is no `<axon-delay-node>`, `<axon-reverb-node>`, or `<axon-bitcrusher-node>`.
3. In `src/nodes/nodeLibrary.ts`:
   - Delay, Reverb, and Bitcrusher are NOT registered in `registerAudioNodes()` or `nodeRegistry`.
4. In presets:
   - `imperial-march` preset includes `delay-fx-1` of type `delay` (or `AUDIO_NODE_TYPES.DELAY`).
   - Because no custom element exists, the node fails to mount and cannot connect `lead-synth-1:audioOut` -> `delay-fx-1:audioIn` -> `master-out-1:audioIn`.

---

## Requirements

1. Create `src/web-components/nodes/audio/delayNode.component.ts`:
   - Subclass `AxonBaseNodeElement<DelayNodeEngine>`.
   - Implement card UI with Time, Feedback, and Mix controls.
   - Expose ports: `audioIn` (string/audio), `time` (number), `feedback` (number), `mix` (number), and `audioOut` (string/audio).
   - Register custom element `axon-delay-node`.
2. Create `src/web-components/nodes/audio/reverbNode.component.ts` and `bitcrusherNode.component.ts` (or unified FX components).
3. Export them in `src/web-components/nodes/audio/index.ts`.
4. Register them in `src/nodes/nodeLibrary.ts` (`registerAudioNodes`) with their respective tags and engine factories.
5. Add TAG_NAMES constants in `constants.ts`:
   - `AXON_DELAY_NODE: 'axon-delay-node'`
   - `AXON_REVERB_NODE: 'axon-reverb-node'`
   - `AXON_BITCRUSHER_NODE: 'axon-bitcrusher-node'`
   Add to `BOX_SELECTOR`.
6. Add unit tests verifying instantiation and port rendering.
