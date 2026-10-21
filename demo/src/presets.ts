import type { SerializedGraph } from '@collidor/axon'
import { AUDIO_NODE_TYPES, NODE_TYPES } from '@collidor/axon'

export interface PresetDemo {
  id: string
  name: string
  icon: string
  description: string
  graph: SerializedGraph
}

export const PRESET_DEMOS: PresetDemo[] = [
  {
    id: 'imperial-march',
    name: 'Imperial March (Star Wars Theme)',
    icon: '⚔️',
    description: 'Algorithmic Star Wars Imperial March theme: Audio Clock transport driving lead synth, brass chords, marching timpani bass, and 808 percussion into Master Output.',
    graph: {
      nodes: [
        {
          id: 'audio-clock-1',
          type: AUDIO_NODE_TYPES.AUDIO_CLOCK,
          x: 40,
          y: 380,
          data: { bpm: 104, beatsPerCycle: 4, run: false },
        },
        {
          id: 'lead-seq-1',
          type: AUDIO_NODE_TYPES.SEQUENCE,
          x: 360,
          y: 40,
          data: {
            notes: ['G3', 'G3', 'G3', 'Eb3', 'Bb3', 'G3', 'Eb3', 'Bb3', 'G3'],
            durationRatio: 0.85,
            velocity: 0.9,
          },
        },
        {
          id: 'bass-seq-1',
          type: AUDIO_NODE_TYPES.SEQUENCE,
          x: 360,
          y: 420,
          data: {
            notes: ['G2', 'G2', 'G2', 'G2', 'Eb2', 'Bb2', 'G2', 'Eb2'],
            durationRatio: 0.8,
            velocity: 0.85,
          },
        },
        {
          id: 'drum-seq-1',
          type: AUDIO_NODE_TYPES.SEQUENCE,
          x: 360,
          y: 800,
          data: {
            notes: ['bd', 'bd', 'bd', 'sd', 'sd', 'sd', 'bd', 'sd'],
            durationRatio: 0.75,
            velocity: 0.8,
          },
        },
        {
          id: 'lead-synth-1',
          type: AUDIO_NODE_TYPES.POLY_SYNTH,
          x: 740,
          y: 40,
          data: { waveform: 'sawtooth', cutoff: 3200, resonance: 3.0, attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.2 },
        },
        {
          id: 'bass-synth-1',
          type: AUDIO_NODE_TYPES.POLY_SYNTH,
          x: 740,
          y: 420,
          data: { waveform: 'square', cutoff: 1400, resonance: 4.0, attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.18 },
        },
        {
          id: 'drum-sampler-1',
          type: AUDIO_NODE_TYPES.DRUM_SAMPLER,
          x: 740,
          y: 800,
          data: { volume: 0.85 },
        },
        {
          id: 'delay-fx-1',
          type: AUDIO_NODE_TYPES.DELAY,
          x: 1040,
          y: 120,
          data: { time: 0.28, feedback: 0.25, mix: 0.2 },
        },
        {
          id: 'audio-mixer-1',
          type: AUDIO_NODE_TYPES.AUDIO_MIXER,
          x: 1280,
          y: 360,
          data: { gain1: 0.9, gain2: 0.85, gain3: 1.0, master: 1.0 },
        },
        {
          id: 'master-out-1',
          type: AUDIO_NODE_TYPES.MASTER_OUTPUT,
          x: 1540,
          y: 360,
          data: { volume: 0.85, muted: false },
        },
      ],
      edges: [
        // Clock arc to all sequence engines
        { from: 'audio-clock-1:arc', to: 'lead-seq-1:arc' },
        { from: 'audio-clock-1:arc', to: 'bass-seq-1:arc' },
        { from: 'audio-clock-1:arc', to: 'drum-seq-1:arc' },
        // Sequences to sound generators
        { from: 'lead-seq-1:events', to: 'lead-synth-1:events' },
        { from: 'bass-seq-1:events', to: 'bass-synth-1:events' },
        { from: 'drum-seq-1:events', to: 'drum-sampler-1:events' },
        // Route audio through delay, mixer and master
        { from: 'lead-synth-1:audioOut', to: 'delay-fx-1:audioIn' },
        { from: 'delay-fx-1:audioOut', to: 'audio-mixer-1:in1' },
        { from: 'bass-synth-1:audioOut', to: 'audio-mixer-1:in2' },
        { from: 'drum-sampler-1:audioOut', to: 'audio-mixer-1:in3' },
        { from: 'audio-mixer-1:audioOut', to: 'master-out-1:audioIn' },
      ],
    },
  },
  {
    id: 'combat-engine',
    name: 'Entity Combat Pipeline',
    icon: '⚔️',
    description: 'Event-driven damage calculation graph with attack power, defense attenuation, and health clamping.',
    graph: {
      nodes: [
        {
          id: 'atk-node',
          type: NODE_TYPES.MATH,
          x: 80,
          y: 100,
          data: { a: 85, b: 15, operator: 'ADD' },
        },
        {
          id: 'def-node',
          type: NODE_TYPES.MATH,
          x: 80,
          y: 280,
          data: { a: 40, b: 0.5, operator: 'MULTIPLY' },
        },
        {
          id: 'dmg-calc',
          type: NODE_TYPES.MATH,
          x: 360,
          y: 180,
          data: { operator: 'SUBTRACT' },
        },
        {
          id: 'gate-node',
          type: NODE_TYPES.COMPARE,
          x: 640,
          y: 180,
          data: { operator: 'GREATER_THAN', b: 0 },
        },
        {
          id: 'display-dmg',
          type: NODE_TYPES.DISPLAY,
          x: 920,
          y: 180,
          data: { label: 'Final Damage' },
        },
      ],
      edges: [
        { from: 'atk-node:result', to: 'dmg-calc:a' },
        { from: 'def-node:result', to: 'dmg-calc:b' },
        { from: 'dmg-calc:result', to: 'gate-node:a' },
        { from: 'dmg-calc:result', to: 'display-dmg:value' },
      ],
    },
  },
  {
    id: 'feedback-acc',
    name: 'Feedback Accumulator',
    icon: '🔁',
    description: 'Clock pulse generator accumulating sum with a 1-cycle feedback delay unit.',
    graph: {
      nodes: [
        {
          id: 'clock-src',
          type: NODE_TYPES.CLOCK,
          x: 80,
          y: 160,
          data: { interval: 1000 },
        },
        {
          id: 'adder',
          type: NODE_TYPES.MATH,
          x: 340,
          y: 160,
          data: { b: 1, operator: 'ADD' },
        },
        {
          id: 'fb-delay',
          type: NODE_TYPES.FEEDBACK,
          x: 620,
          y: 160,
          data: { initialValue: 0 },
        },
        {
          id: 'display-acc',
          type: NODE_TYPES.DISPLAY,
          x: 880,
          y: 160,
          data: { label: 'Accumulator Count' },
        },
      ],
      edges: [
        { from: 'clock-src:tick', to: 'adder:a' },
        { from: 'adder:result', to: 'fb-delay:input' },
        { from: 'fb-delay:output', to: 'adder:b' },
        { from: 'adder:result', to: 'display-acc:value' },
      ],
    },
  },
  {
    id: 'data-transforms',
    name: 'Dynamic Data Transforms',
    icon: '⚡',
    description: 'Streaming array transform and filter nodes executing structured record pipelines.',
    graph: {
      nodes: [
        {
          id: 'source-data',
          type: NODE_TYPES.CONSTANT,
          x: 80,
          y: 160,
          data: {
            value: [
              { name: 'Pikachu', level: 25, type: 'Electric' },
              { name: 'Charizard', level: 60, type: 'Fire' },
              { name: 'Squirtle', level: 12, type: 'Water' },
            ],
          },
        },
        {
          id: 'filter-transform',
          type: NODE_TYPES.ARRAY_TRANSFORM,
          x: 400,
          y: 160,
          data: { mode: 'filter', expression: 'item.level >= 20' },
        },
        {
          id: 'display-table',
          type: NODE_TYPES.DISPLAY,
          x: 740,
          y: 160,
          data: { label: 'Filtered Entities' },
        },
      ],
      edges: [
        { from: 'source-data:value', to: 'filter-transform:array' },
        { from: 'filter-transform:result', to: 'display-table:value' },
      ],
    },
  },
  {
    id: 'nested-subgraph',
    name: 'Nested Subgraph Pipeline',
    icon: '⧉',
    description: 'Multi-layer isolated subgraph with drill-down navigation and input/output port passthrough.',
    graph: {
      nodes: [
        {
          id: 'const-in-1',
          type: NODE_TYPES.CONSTANT,
          x: 80,
          y: 160,
          data: { value: 50 },
        },
        {
          id: 'subgraph-unit',
          type: NODE_TYPES.SUBGRAPH,
          x: 400,
          y: 160,
          data: {
            name: 'Math Processor Subgraph',
            graph: {
              nodes: [
                { id: 'in-port', type: NODE_TYPES.GROUP_INPUT, x: 50, y: 100, data: { name: 'val_in', type: 'number' } },
                { id: 'sub-math', type: NODE_TYPES.MATH, x: 280, y: 100, data: { b: 2, operator: 'MULTIPLY' } },
                { id: 'out-port', type: NODE_TYPES.GROUP_OUTPUT, x: 520, y: 100, data: { name: 'val_out', type: 'number' } },
              ],
              edges: [
                { from: 'in-port:value', to: 'sub-math:a' },
                { from: 'sub-math:result', to: 'out-port:value' },
              ],
            },
          },
        },
        {
          id: 'display-out',
          type: NODE_TYPES.DISPLAY,
          x: 760,
          y: 160,
          data: { label: 'Processed Value' },
        },
      ],
      edges: [
        { from: 'const-in-1:value', to: 'subgraph-unit:val_in' },
        { from: 'subgraph-unit:val_out', to: 'display-out:value' },
      ],
    },
  },
]

