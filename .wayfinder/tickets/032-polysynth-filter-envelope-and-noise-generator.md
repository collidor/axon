# Ticket 032: PolySynth Filter Envelope & Noise Generator

## Status: RESOLVED

## Context & Problem
Ticket 012 and the two-axis code review identified that `PolySynthNodeEngine` was missing the `filterEnv` input for dynamic filter envelope modulation sweeps, and did not properly configure or route white noise when `waveform: 'noise'` was selected.

## Requirements
1. Add `filterEnv` to `polySynthDataSchema`, `PolySynthData`, `PolySynthInputs`, and constructor options in `src/nodes/audio/polySynth.engine.ts`.
2. Add dynamic filter envelope modulation ramping (`cutoff + filterEnv`) during attack, decay, sustain, and release phases in `scheduleVoice()`.
3. Generate white noise buffer and route dual `osc` and `noise` sources per voice when `waveform === 'noise'`.
4. Ensure all voice nodes and buffers are cleanly torn down on destruction without throwing.
5. Add unit tests in `src/nodes/audio/__tests__/polySynth.spec.ts`.
