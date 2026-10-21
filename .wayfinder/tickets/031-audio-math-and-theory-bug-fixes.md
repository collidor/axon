# Ticket 031: Audio Math & Theory Bug Fixes

## Status: RESOLVED

## Context & Problem
During code review, three specific audio theory and clock issues were discovered:
1. `ScaleQuantizerNodeEngine` computed snapped MIDI as `octave * 12 + rootPitchClass + bestInterval`. When `rootPitchClass + bestInterval >= 12`, adding it to `octave * 12` caused an unwarranted octave jump (e.g. C4 in A minor snapped to C5).
2. `ArpeggiatorNodeEngine` transposed frequencies by `2^o` across multiple octaves, but pushed untransposed note name strings from `rawNotes[i]`, resulting in repeated base-octave note names (e.g. `C4` instead of `C5`).
3. `AudioClockNodeEngine` emitted timestamps instead of boolean pulses on its `tick` port (`tick: typeof Number`), causing port subtyping rejections when connecting to boolean-clock inputs (`arpeggiator.clock`, `stepSequencer.clock`, etc.).

## Requirements
1. Implement circular signed shortest-distance interval delta snapping in `ScaleQuantizerNodeEngine` without octave jumps.
2. Transpose note name strings by octave in `ArpeggiatorNodeEngine.getPool()` using `frequencyToMidi` and `midiToNoteName`.
3. Update `AudioClockNodeEngine` to emit `tick: boolean` (`true` pulse) with `Boolean` type schema.
4. Add comprehensive unit tests in `src/nodes/audio/__tests__/theoryAndClockFixes.spec.ts`.
