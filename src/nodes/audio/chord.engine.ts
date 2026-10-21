import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import { noteToFrequency, frequencyToMidi } from './audio.types'
import { midiToNoteName } from './stepSequencer.engine'

export const CHORD_TYPES: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
}

export const chordDataSchema = s.struct({
  root: s.string().default('C4'),
  type: s.string().default('min7'),
  inversion: s.number().default(0),
})

export type ChordData = {
  root?: string
  type?: string
  inversion?: number
  [key: string]: unknown
}

export type ChordInputs = {
  root: typeof String
  type: typeof String
  inversion: typeof Number
}

export type ChordOutputs = {
  notes: null
  frequencies: null
  midis: null
}

export class ChordNodeEngine extends BaseNode<ChordInputs, ChordOutputs, ChordData> {
  constructor(
    options: Partial<NodeInitOptions<ChordInputs, ChordOutputs, ChordData>> = {},
  ) {
    const initialData: ChordData = {
      root: options.initialData?.root ?? 'C4',
      type: options.initialData?.type ?? 'min7',
      inversion: options.initialData?.inversion ?? 0,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.CHORD,
      dataSchema: chordDataSchema,
      inputs: options.inputs ?? {
        root: String,
        type: String,
        inversion: Number,
      },
      outputs: options.outputs ?? {
        notes: null,
        frequencies: null,
        midis: null,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        ;(ctx.node as ChordNodeEngine).generateChord()
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })

    this.generateChord()
  }

  public generateChord(): { notes: string[]; frequencies: number[]; midis: number[] } {
    const rootStr = (this.getInputs().root || this.data.root || 'C4').trim()
    const chordType = String(this.getInputs().type || this.data.type || 'min7').toLowerCase()
    const inv = Number(this.getInputs().inversion ?? this.data.inversion ?? 0)

    const intervals = CHORD_TYPES[chordType] || CHORD_TYPES.maj
    const rootFreq = noteToFrequency(rootStr)
    const rootMidi = frequencyToMidi(rootFreq)

    let midis = intervals.map((iv) => rootMidi + iv)

    // Apply inversion
    if (inv > 0) {
      for (let i = 0; i < inv; i++) {
        const bottom = midis.shift()!
        midis.push(bottom + 12)
      }
    }

    const frequencies = midis.map((m) => noteToFrequency(m))
    const notes = midis.map((m) => midiToNoteName(m))

    this.emitOutput('notes', notes)
    this.emitOutput('frequencies', frequencies)
    this.emitOutput('midis', midis)

    return { notes, frequencies, midis }
  }
}

export function createChordNode(
  options: Partial<NodeInitOptions<ChordInputs, ChordOutputs, ChordData>> = {},
) {
  return new ChordNodeEngine(options)
}
