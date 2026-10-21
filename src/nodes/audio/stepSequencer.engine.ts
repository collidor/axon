import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import { noteToFrequency, frequencyToMidi, type AudioEvent } from './audio.types'

export interface StepItem {
  active: boolean
  noteOffset: number
  velocity: number
}

export const stepSequencerDataSchema = s.struct({
  length: s.number().min(1).max(32).default(16),
  rootNote: s.string().default('C3'),
})

export type StepSequencerData = {
  length?: number
  rootNote?: string
  steps?: StepItem[]
  [key: string]: unknown
}

export type StepSequencerInputs = {
  step: typeof Number
  clock: typeof Boolean
  length: typeof Number
  rootNote: typeof String
}

export type StepSequencerOutputs = {
  trigger: typeof Boolean
  note: typeof String
  freq: typeof Number
  velocity: typeof Number
  event: null
  currentStep: typeof Number
}

export class StepSequencerNodeEngine extends BaseNode<
  StepSequencerInputs,
  StepSequencerOutputs,
  StepSequencerData
> {
  private currentStep = 0
  private stepItems: StepItem[] = []

  constructor(
    options: Partial<
      NodeInitOptions<StepSequencerInputs, StepSequencerOutputs, StepSequencerData>
    > = {},
  ) {
    const initialData: StepSequencerData = {
      length: options.initialData?.length ?? 16,
      rootNote: options.initialData?.rootNote ?? 'C3',
      steps: options.initialData?.steps ?? [],
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.STEP_SEQUENCER,
      dataSchema: stepSequencerDataSchema,
      inputs: options.inputs ?? {
        step: Number,
        clock: Boolean,
        length: Number,
        rootNote: String,
      },
      outputs: options.outputs ?? {
        trigger: Boolean,
        note: String,
        freq: Number,
        velocity: Number,
        event: null,
        currentStep: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'clock' && Boolean(value)) {
          ;(ctx.node as StepSequencerNodeEngine).advanceStep()
        } else if (name === 'step' && typeof value === 'number') {
          ;(ctx.node as StepSequencerNodeEngine).setStep(Math.floor(value))
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })

    this.initSteps()
  }

  private initSteps(): void {
    const len = this.data.length ?? 16
    if (this.data.steps && this.data.steps.length > 0) {
      this.stepItems = this.data.steps.slice(0, len)
    } else {
      this.stepItems = Array.from({ length: len }, (_, i) => ({
        active: i % 4 === 0, // default quarter note kick/trigger
        noteOffset: 0,
        velocity: 0.8,
      }))
    }
  }

  public getSteps(): StepItem[] {
    return [...this.stepItems]
  }

  public setStepItem(index: number, item: Partial<StepItem>): void {
    if (index >= 0 && index < this.stepItems.length) {
      this.stepItems[index] = { ...this.stepItems[index], ...item }
      this.data.steps = [...this.stepItems]
    }
  }

  public advanceStep(): void {
    const len = this.stepItems.length || 1
    this.currentStep = (this.currentStep + 1) % len
    this.evalStep(this.currentStep)
  }

  public setStep(step: number): void {
    const len = this.stepItems.length || 1
    this.currentStep = ((step % len) + len) % len
    this.evalStep(this.currentStep)
  }

  private evalStep(idx: number): void {
    const item = this.stepItems[idx] ?? { active: false, noteOffset: 0, velocity: 0 }
    const root = this.getInputs().rootNote || this.data.rootNote || 'C3'
    const rootFreq = noteToFrequency(root)
    const rootMidi = frequencyToMidi(rootFreq)

    const finalMidi = rootMidi + item.noteOffset
    const freq = noteToFrequency(finalMidi)
    const noteName = midiToNoteName(finalMidi)

    this.emitOutput('currentStep', idx)
    this.emitOutput('trigger', item.active)
    this.emitOutput('velocity', item.velocity)
    this.emitOutput('freq', freq)
    this.emitOutput('note', noteName)

    if (item.active) {
      const audioEvent: AudioEvent = {
        time: performance.now() / 1000,
        duration: 0.25,
        note: noteName,
        freq,
        velocity: item.velocity,
        pan: 0.0,
      }
      this.emitOutput('event', audioEvent)
    }
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNoteName(midi: number): string {
  const note = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${octave}`
}

export function createStepSequencerNode(
  options: Partial<
    NodeInitOptions<StepSequencerInputs, StepSequencerOutputs, StepSequencerData>
  > = {},
) {
  return new StepSequencerNodeEngine(options)
}
