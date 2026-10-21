# Ticket 022: Implement Pure Graph Sequence Node and Parallel Node

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None
**Blocks**: None

---

## Question

How do we represent algorithmic music sequences and polyphony purely with visual graph nodes (Sequence Node and Parallel Node) without parsing strings, so users can visually compose and subdivide time intervals?

---

## Requirements

1. **`SequenceNodeEngine` (`src/nodes/audio/sequence.engine.ts`)**:
   - Takes incoming `arc` from `AudioClockNodeEngine` (or manual step queries).
   - Has configurable slots (e.g. array of notes/items, or multi-port inputs `in1`, `in2`, ... `inN`).
   - Slices the cycle `[0, 1]` evenly across $N$ sequential subdivisions ($1/N$ cycle slice per element).
   - Generates and emits scheduled `AudioEvent[]` at the precise `eventTime = arc.time + (slotIndex / N) / cps` and `duration = (1 / N) / cps`.
   - Emits `events`, `activeItem`, and `stepIndex`.

2. **`ParallelNodeEngine` (`src/nodes/audio/parallel.engine.ts`)**:
   - Takes incoming `arc` and broadcasts to multiple child branches or merges multiple incoming `AudioEvent[]` inputs (`in1`, `in2`, ... `inN` or `layers`).
   - Schedules simultaneous playback over the same cycle interval (stack / chord polyphony / drum layers).
   - Emits consolidated `events: AudioEvent[]` ready for PolySynth, DrumSampler, or FX.

3. **Node Registrations & Web Components**:
   - Register in `AUDIO_NODE_TYPES` as `SEQUENCE: 'sequence'` and `PARALLEL: 'parallel'`.
   - Register in `nodeLibrary.ts`.
   - Create custom visual elements `<axon-sequence-node>` and `<axon-parallel-node>`.

4. **Testing**:
   - Unit tests in `src/nodes/audio/__tests__/sequenceParallel.spec.ts` testing cycle time slicing, multi-voice stacking, and deterministic arc queries.
