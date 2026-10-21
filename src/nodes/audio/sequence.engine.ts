import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import { noteToFrequency, type AudioEvent } from './audio.types'
import type { CycleArc } from './clock.engine'

export const sequenceDataSchema = s.struct({
  notes: s.array(s.string()).default(['C4', 'E4', 'G4', 'B4']),
  durationRatio: s.number().min(0.01).max(2).default(0.9),
  velocity: s.number().min(0).max(1).default(0.8),
})

export type SequenceData = {
  notes?: string[]
  durationRatio?: number
  velocity?: number
  [key: string]: unknown
}

export type SequenceInputs = {
  arc: null
  notes: null
  velocity: typeof Number
  durationRatio: typeof Number
  reset: typeof Boolean
}

export type SequenceOutputs = {
  events: null
  activeNote: typeof String
  stepIndex: typeof Number
}

export class SequenceNodeEngine extends BaseNode<
  SequenceInputs,
  SequenceOutputs,
  SequenceData
> {
  private lastScheduledStep: number = -1

  constructor(
    options: Partial<
      NodeInitOptions<SequenceInputs, SequenceOutputs, SequenceData>
    > = {},
  ) {
    const initialData: SequenceData = {
      notes: options.initialData?.notes ?? ['C4', 'E4', 'G4', 'B4'],
      durationRatio: options.initialData?.durationRatio ?? 0.9,
      velocity: options.initialData?.velocity ?? 0.8,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.SEQUENCE,
      dataSchema: sequenceDataSchema,
      inputs: options.inputs ?? {
        arc: null,
        notes: null,
        velocity: Number,
        durationRatio: Number,
        reset: Boolean,
      },
      outputs: options.outputs ?? {
        events: null,
        activeNote: String,
        stepIndex: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'arc' && value && typeof value === 'object') {
          ;(ctx.node as SequenceNodeEngine).processArc(value as CycleArc)
        } else if (name === 'notes' || name === 'reset') {
          ;(ctx.node as SequenceNodeEngine).reset()
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })
  }

  public getNotes(): string[] {
    const inputNotes = this.getInputs().notes
    if (Array.isArray(inputNotes) && inputNotes.length > 0) {
      return inputNotes.map((n) => String(n))
    }
    return this.data.notes ?? ['C4', 'E4', 'G4', 'B4']
  }

  public setNotes(newNotes: string[]): void {
    this.data.notes = [...newNotes]
    this.setInput('notes', [...newNotes])
    this.reset()
  }

  public reset(): void {
    this.lastScheduledStep = -1
  }

  public processArc(arc: CycleArc): AudioEvent[] {
    const notes = this.getNotes()
    if (notes.length === 0) {
      this.emitOutput('events', [])
      return []
    }

    const n = notes.length
    const durationRatio = Number(this.getInputs().durationRatio ?? this.data.durationRatio ?? 0.9)
    const velocity = Number(this.getInputs().velocity ?? this.data.velocity ?? 0.8)

    // Detect transport restart / seek back
    if (
      (arc.start === 0 && arc.cycle === 0 && arc.phase === 0) ||
      (this.lastScheduledStep >= 0 && arc.end < this.lastScheduledStep / n)
    ) {
      this.lastScheduledStep = -1
    }

    const currentStep = Math.floor(arc.phase * n) % n
    this.emitOutput('stepIndex', currentStep)
    this.emitOutput('activeNote', notes[currentStep] ?? '')

    // Calculate elapsed cycle window
    const minCycle = Math.floor(arc.start)
    const maxCycle = Math.ceil(arc.end)
    const audioEvents: AudioEvent[] = []

    for (let c = minCycle; c < maxCycle; c++) {
      for (let i = 0; i < n; i++) {
        const slotStartCycle = c + i / n
        const slotEndCycle = c + (i + 1) / n

        // Check if slot falls within queried arc [arc.start, arc.end]
        if (slotEndCycle <= arc.start || slotStartCycle >= arc.end) {
          continue
        }

        const globalStep = c * n + i
        if (globalStep <= this.lastScheduledStep) {
          continue
        }

        const noteVal = notes[i].trim()
        if (!noteVal || noteVal === '~' || noteVal.toLowerCase() === 'rest') {
          this.lastScheduledStep = Math.max(this.lastScheduledStep, globalStep)
          continue
        }

        const cycleOffset = Math.max(0, slotStartCycle - arc.start)
        // Calculate duration and time in seconds using cycle time / duration
        const cycleDurationSec = arc.duration > 0 && arc.end > arc.start
          ? arc.duration / (arc.end - arc.start)
          : 0.5

        const rawEventTime = arc.time + cycleOffset * cycleDurationSec
        const eventTime = Math.max(0, Number.isFinite(rawEventTime) ? rawEventTime : 0)
        const eventDuration = Math.max(0.02, (1 / n) * cycleDurationSec * durationRatio)

        const event: AudioEvent = {
          time: eventTime,
          duration: eventDuration,
          note: noteVal,
          freq: noteToFrequency(noteVal),
          velocity,
          pan: 0.0,
        }

        audioEvents.push(event)
        this.lastScheduledStep = Math.max(this.lastScheduledStep, globalStep)
      }
    }

    this.emitOutput('events', audioEvents)
    return audioEvents
  }
}

export function createSequenceNode(
  options: Partial<
    NodeInitOptions<SequenceInputs, SequenceOutputs, SequenceData>
  > = {},
) {
  return new SequenceNodeEngine(options)
}
