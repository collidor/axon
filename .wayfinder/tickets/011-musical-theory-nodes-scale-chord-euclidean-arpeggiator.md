# Ticket 011: Musical Theory & Visual Sequencing Nodes

**Labels**: `wayfinder:task`
**Status**: Closed (Resolved)
**Resolution**: Implemented `EuclideanRhythmNodeEngine` (Bjorklund algorithm with rotation), `StepSequencerNodeEngine` (16-step pitch/velocity), `ScaleQuantizerNodeEngine` (12 musical scales), `ChordNodeEngine` (triads, 7ths, inversions), and `ArpeggiatorNodeEngine` (up, down, upDown, random, multi-octave) in `src/nodes/audio/`. Registered in `nodeLibrary.ts`. 6 unit tests passing in `src/nodes/audio/__tests__/sequencing.spec.ts`.
**Blocked by**: Ticket 009
**Blocks**: Ticket 014

---

## Question

How do we provide modular visual sequencing and music theory nodes in Axon (Euclidean rhythm generator, 16-step sequencer, scale quantizer, chord generator, and arpeggiator) that work seamlessly with graph clocking and Strudel event pipelines?

---

## Requirements

1. **`EuclideanRhythmNodeEngine` (`src/nodes/audio/euclidean.engine.ts`)**:
   - Generates Euclidean rhythm pulses using Bjorklund's algorithm.
   - Inputs:
     - `hits`: number (number of pulses, e.g. 3)
     - `steps`: number (total steps in loop, e.g. 8)
     - `rotate`: number (step rotation offset, default: 0)
     - `clock`: boolean (input trigger or cycle step)
   - Outputs:
     - `trigger`: boolean (true on active hit step)
     - `pattern`: boolean[] (array representation e.g. `[true, false, false, true, false, false, true, false]`)
     - `stepIndex`: number (current step 0 to steps - 1)

2. **`StepSequencerNodeEngine` (`src/nodes/audio/stepSequencer.engine.ts`)**:
   - 16-step programmable pitch and velocity sequencer.
   - Inputs:
     - `step`: number (clock step counter)
     - `length`: number (sequence length: 4, 8, 16, etc.)
     - `rootNote`: string (e.g. `'C3'`)
   - Initial Data:
     - `steps`: Array of 16 step objects `{ active: boolean, noteOffset: number, velocity: number }`
   - Outputs:
     - `trigger`: boolean
     - `note`: string
     - `velocity`: number
     - `event`: `AudioEvent`

3. **`ScaleQuantizerNodeEngine` (`src/nodes/audio/scaleQuantizer.engine.ts`)**:
   - Snaps continuous or arbitrary numeric pitch inputs to musical scale notes.
   - Supported scales: Major, Minor (Natural, Harmonic, Melodic), Dorian, Phrygian, Lydian, Mixolydian, Minor Pentatonic, Major Pentatonic, Blues, Chromatic.
   - Inputs:
     - `pitch`: number | string
     - `root`: string (e.g. `'C'`, `'F#'`)
     - `scale`: string (e.g. `'minor'`, `'dorian'`)
   - Outputs:
     - `quantizedNote`: string
     - `quantizedFreq`: number

4. **`ChordNodeEngine` & `ArpeggiatorNodeEngine` (`src/nodes/audio/chord.engine.ts`, `arpeggiator.engine.ts`)**:
   - Chord generator: expands root note into chord triads/seventh chords (maj, min, 7, maj7, min7, sus4, dim).
   - Arpeggiator: iterates chord notes in pattern modes (`up`, `down`, `upDown`, `random`) synced to step pulses.

5. **Testing**:
   - Unit tests covering Bjorklund Euclidean distribution, scale quantization mathematics, and chord generation in `src/nodes/audio/__tests__/sequencing.spec.ts`.
