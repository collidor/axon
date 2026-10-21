import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import { noteToFrequency, frequencyToMidi } from './audio.types'
import { midiToNoteName } from './stepSequencer.engine'

export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor / aeolian
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

export const scaleQuantizerDataSchema = s.struct({
  root: s.string().default('C'),
  scale: s.string().default('minor'),
})

export type ScaleQuantizerData = {
  root?: string
  scale?: string
  [key: string]: unknown
}

export type ScaleQuantizerInputs = {
  pitch: null
  root: typeof String
  scale: typeof String
}

export type ScaleQuantizerOutputs = {
  quantizedNote: typeof String
  quantizedFreq: typeof Number
  midi: typeof Number
}

export class ScaleQuantizerNodeEngine extends BaseNode<
  ScaleQuantizerInputs,
  ScaleQuantizerOutputs,
  ScaleQuantizerData
> {
  constructor(
    options: Partial<
      NodeInitOptions<
        ScaleQuantizerInputs,
        ScaleQuantizerOutputs,
        ScaleQuantizerData
      >
    > = {},
  ) {
    const initialData: ScaleQuantizerData = {
      root: options.initialData?.root ?? 'C',
      scale: options.initialData?.scale ?? 'minor',
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.SCALE_QUANTIZER,
      dataSchema: scaleQuantizerDataSchema,
      inputs: options.inputs ?? {
        pitch: null,
        root: String,
        scale: String,
      },
      outputs: options.outputs ?? {
        quantizedNote: String,
        quantizedFreq: Number,
        midi: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'pitch') {
          this.quantize(value)
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })
  }

  public quantize(pitchInput: unknown): { note: string; freq: number; midi: number } {
    const rootStr = (this.getInputs().root || this.data.root || 'C').trim()
    const scaleKey = String(this.getInputs().scale || this.data.scale || 'minor').toLowerCase()
    const intervals = SCALES[scaleKey] || SCALES.minor

    const rootFreq = noteToFrequency(`${rootStr}4`)
    const rootMidi = frequencyToMidi(rootFreq)
    const rootPitchClass = ((rootMidi % 12) + 12) % 12

    let targetMidi: number
    if (typeof pitchInput === 'number') {
      if (pitchInput > 130) {
        targetMidi = frequencyToMidi(pitchInput)
      } else {
        targetMidi = Math.round(pitchInput)
      }
    } else if (typeof pitchInput === 'string') {
      targetMidi = frequencyToMidi(noteToFrequency(pitchInput))
    } else {
      targetMidi = 60 // Default middle C
    }

    // Snap targetMidi to closest scale degree
    const octave = Math.floor(targetMidi / 12)
    const pitchClass = ((targetMidi % 12) + 12) % 12

    // Relative to root
    const relClass = ((pitchClass - rootPitchClass) % 12 + 12) % 12

    // Find nearest interval (using circular distance on 12-semitone circle)
    let bestDelta = 0
    let minDiff = 999
    for (const iv of intervals) {
      const delta = ((iv - relClass + 18) % 12) - 6
      const diff = Math.abs(delta)
      if (diff < minDiff) {
        minDiff = diff
        bestDelta = delta
      }
    }

    const snappedMidi = targetMidi + bestDelta
    const freq = noteToFrequency(snappedMidi)
    const note = midiToNoteName(snappedMidi)

    this.emitOutput('quantizedNote', note)
    this.emitOutput('quantizedFreq', freq)
    this.emitOutput('midi', snappedMidi)

    return { note, freq, midi: snappedMidi }
  }
}

export function createScaleQuantizerNode(
  options: Partial<
    NodeInitOptions<
      ScaleQuantizerInputs,
      ScaleQuantizerOutputs,
      ScaleQuantizerData
    >
  > = {},
) {
  return new ScaleQuantizerNodeEngine(options)
}
