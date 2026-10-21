import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import { noteToFrequency, frequencyToMidi, type AudioEvent } from './audio.types'
import { midiToNoteName } from './stepSequencer.engine'

export const arpeggiatorDataSchema = s.struct({
  mode: s.string().default('up'),
  octaves: s.number().min(1).max(4).default(1),
})

export type ArpeggiatorData = {
  mode?: 'up' | 'down' | 'upDown' | 'random'
  octaves?: number
  [key: string]: unknown
}

export type ArpeggiatorInputs = {
  notes: null
  frequencies: null
  clock: typeof Boolean
  step: typeof Number
  mode: typeof String
  octaves: typeof Number
}

export type ArpeggiatorOutputs = {
  trigger: typeof Boolean
  note: typeof String
  freq: typeof Number
  event: null
  index: typeof Number
}

export class ArpeggiatorNodeEngine extends BaseNode<
  ArpeggiatorInputs,
  ArpeggiatorOutputs,
  ArpeggiatorData
> {
  private currentStepIndex = 0
  private direction = 1

  constructor(
    options: Partial<
      NodeInitOptions<ArpeggiatorInputs, ArpeggiatorOutputs, ArpeggiatorData>
    > = {},
  ) {
    const initialData: ArpeggiatorData = {
      mode: options.initialData?.mode ?? 'up',
      octaves: options.initialData?.octaves ?? 1,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.ARPEGGIATOR,
      dataSchema: arpeggiatorDataSchema,
      inputs: options.inputs ?? {
        notes: null,
        frequencies: null,
        clock: Boolean,
        step: Number,
        mode: String,
        octaves: Number,
      },
      outputs: options.outputs ?? {
        trigger: Boolean,
        note: String,
        freq: Number,
        event: null,
        index: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'clock' && Boolean(value)) {
          this.advance()
        } else if (name === 'step' && typeof value === 'number') {
          this.setStep(Math.floor(value))
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })
  }

  private getPool(): { notes: string[]; freqs: number[] } {
    const inputs = this.getInputs()
    let rawNotes: string[] = Array.isArray(inputs.notes) ? inputs.notes : ['C4', 'E4', 'G4']
    let rawFreqs: number[] = Array.isArray(inputs.frequencies)
      ? inputs.frequencies
      : rawNotes.map((n) => noteToFrequency(n))

    const octaves = Number(inputs.octaves || this.data.octaves || 1)
    if (octaves > 1) {
      const fullNotes: string[] = []
      const fullFreqs: number[] = []
      for (let o = 0; o < octaves; o++) {
        for (let i = 0; i < rawFreqs.length; i++) {
          const freq = rawFreqs[i] * Math.pow(2, o)
          fullFreqs.push(freq)
          const midi = frequencyToMidi(freq)
          fullNotes.push(midiToNoteName(midi))
        }
      }
      return { notes: fullNotes, freqs: fullFreqs }
    }

    return { notes: rawNotes, freqs: rawFreqs }
  }

  public advance(): { note: string; freq: number } {
    const pool = this.getPool()
    const len = pool.freqs.length || 1
    const mode = String(this.getInputs().mode || this.data.mode || 'up')

    if (mode === 'random') {
      this.currentStepIndex = Math.floor(Math.random() * len)
    } else if (mode === 'down') {
      this.currentStepIndex = (this.currentStepIndex - 1 + len) % len
    } else if (mode === 'upDown') {
      this.currentStepIndex += this.direction
      if (this.currentStepIndex >= len - 1) {
        this.currentStepIndex = len - 1
        this.direction = -1
      } else if (this.currentStepIndex <= 0) {
        this.currentStepIndex = 0
        this.direction = 1
      }
    } else {
      // up
      this.currentStepIndex = (this.currentStepIndex + 1) % len
    }

    return this.emitAt(this.currentStepIndex, pool)
  }

  public setStep(step: number): { note: string; freq: number } {
    const pool = this.getPool()
    const len = pool.freqs.length || 1
    this.currentStepIndex = ((step % len) + len) % len
    return this.emitAt(this.currentStepIndex, pool)
  }

  private emitAt(idx: number, pool: { notes: string[]; freqs: number[] }): { note: string; freq: number } {
    const note = pool.notes[idx] ?? 'C4'
    const freq = pool.freqs[idx] ?? 261.63

    this.emitOutput('index', idx)
    this.emitOutput('note', note)
    this.emitOutput('freq', freq)
    this.emitOutput('trigger', true)

    const event: AudioEvent = {
      time: performance.now() / 1000,
      duration: 0.25,
      note,
      freq,
      velocity: 0.8,
      pan: 0.0,
    }
    this.emitOutput('event', event)

    return { note, freq }
  }
}

export function createArpeggiatorNode(
  options: Partial<
    NodeInitOptions<ArpeggiatorInputs, ArpeggiatorOutputs, ArpeggiatorData>
  > = {},
) {
  return new ArpeggiatorNodeEngine(options)
}
