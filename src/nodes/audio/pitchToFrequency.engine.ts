import { MapSchema, NodeInitOptions } from '../../core'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'

export type PitchToFrequencyInputSchema = {
  pitch: typeof Number
}

export type PitchToFrequencyOutputSchema = {
  frequency: typeof Number
}

export const pitchToFrequencyConfig: NodeInitOptions<
  PitchToFrequencyInputSchema,
  PitchToFrequencyOutputSchema
> = {
  nodeType: AUDIO_NODE_TYPES.PITCH_TO_FREQUENCY,
  inputs: {
    pitch: Number,
  },
  outputs: {
    frequency: Number,
  },
  onInputChange(_name, _value, { inputs, emitOutput }) {
    execute(inputs, emitOutput)
  },
}

function execute(
  inputs: Partial<MapSchema<PitchToFrequencyInputSchema>>,
  emitOutput: <K extends keyof PitchToFrequencyOutputSchema>(
    outputName: K,
    value: MapSchema<PitchToFrequencyOutputSchema>[K],
  ) => void,
) {
  if (!inputs.pitch) return

  const frequency = (440 * 2) ^ ((inputs.pitch - 69) / 12)
  emitOutput('frequency', frequency)
}
