export const AUDIO_NODE_TYPES = {
  PITCH_TO_FREQUENCY: 'pitch-to-frequency',
  AUDIO_CLOCK: 'audio-clock',
  SEQUENCE: 'sequence',
  PARALLEL: 'parallel',
  EUCLIDEAN: 'euclidean',
  STEP_SEQUENCER: 'step-sequencer',
  SCALE_QUANTIZER: 'scale-quantizer',
  CHORD: 'chord',
  ARPEGGIATOR: 'arpeggiator',
  POLY_SYNTH: 'poly-synth',
  DRUM_SAMPLER: 'drum-sampler',
  DELAY: 'delay',
  REVERB: 'reverb',
  BITCRUSHER: 'bitcrusher',
  MASTER_OUTPUT: 'master-output',
  AUDIO_MIXER: 'audio-mixer',
  AUDIO_COMBINER: 'audio-combiner',
} as const

export const SOUND_NODE_TYPES = AUDIO_NODE_TYPES

export type AudioNodeType = (typeof AUDIO_NODE_TYPES)[keyof typeof AUDIO_NODE_TYPES]
export type SoundNodeType = AudioNodeType
