import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import type { AudioEvent } from './audio.types'

export const parallelDataSchema = s.struct({
  enabled: s.boolean().default(true),
})

export type ParallelData = {
  enabled?: boolean
  [key: string]: unknown
}

export type ParallelInputs = {
  in1: null
  in2: null
  in3: null
  in4: null
  layers: null
}

export type ParallelOutputs = {
  events: null
  voiceCount: typeof Number
}

export class ParallelNodeEngine extends BaseNode<
  ParallelInputs,
  ParallelOutputs,
  ParallelData
> {
  constructor(
    options: Partial<
      NodeInitOptions<ParallelInputs, ParallelOutputs, ParallelData>
    > = {},
  ) {
    const initialData: ParallelData = {
      enabled: options.initialData?.enabled ?? true,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.PARALLEL,
      dataSchema: parallelDataSchema,
      inputs: options.inputs ?? {
        in1: null,
        in2: null,
        in3: null,
        in4: null,
        layers: null,
      },
      outputs: options.outputs ?? {
        events: null,
        voiceCount: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        ;(ctx.node as ParallelNodeEngine).mergeEvents()
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })
  }

  public mergeEvents(): AudioEvent[] {
    const inputs = this.getInputs()
    const allEvents: AudioEvent[] = []

    const addList = (val: unknown) => {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object' && 'time' in item) {
            allEvents.push(item as AudioEvent)
          } else if (Array.isArray(item)) {
            addList(item)
          }
        }
      }
    }

    addList(inputs.in1)
    addList(inputs.in2)
    addList(inputs.in3)
    addList(inputs.in4)
    addList(inputs.layers)

    // Sort chronologically
    allEvents.sort((a, b) => a.time - b.time)

    this.emitOutput('events', allEvents)
    this.emitOutput('voiceCount', allEvents.length)

    return allEvents
  }
}

export function createParallelNode(
  options: Partial<
    NodeInitOptions<ParallelInputs, ParallelOutputs, ParallelData>
  > = {},
) {
  return new ParallelNodeEngine(options)
}
