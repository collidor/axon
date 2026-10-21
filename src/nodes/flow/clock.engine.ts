import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { TickEngine } from '../../systems/tickEngine.system'
import { NODE_TYPES } from '../nodes.constants'

export type ClockInputSchema = {
  hz: typeof Number
}

export type ClockOutputSchema = {
  tick: typeof Number
}

export interface ClockData {
  hz?: number
  unsub?: () => void
  restart?: () => void
  [key: string]: unknown
}

export const clockDataSchema = s.struct({
  hz: s.number().min(0.1).max(240).default(30),
})

export const clockNodeConfig: NodeInitOptions<ClockInputSchema, ClockOutputSchema, ClockData> = {
  nodeType: NODE_TYPES.CLOCK,
  dataSchema: clockDataSchema,
  inputs: {
    hz: Number,
  },
  outputs: {
    tick: Number,
  },
  initialData: {},
  onInit(context) {
    if (context.data.hz !== undefined) {
      context.node.setInput('hz', context.data.hz)
    }

    const tickEngine = new TickEngine()
    let accumulatedMs = 0

    const restart = () => {
      if (context.data.unsub) {
        context.data.unsub()
        context.data.unsub = undefined
      }
      accumulatedMs = 0

      const hz = context.inputs.hz ?? context.data.hz ?? 30
      if (hz <= 0) return

      const intervalMs = 1000 / hz

      // Use unified TickEngine for drift-free tick scheduling across headless and browser runtimes
      const unsubTick = tickEngine.addTickCallback({
        callback: (deltaTime) => {
          accumulatedMs += deltaTime
          while (accumulatedMs >= intervalMs) {
            accumulatedMs -= intervalMs
            context.emitOutput('tick', Date.now())
          }
        },
      })
      context.data.unsub = unsubTick
    }

    context.data.restart = restart
    restart()
  },
  onInputChange(name, value, context) {
    if (name === 'hz') {
      context.data.hz = value as number
      context.data.restart?.()
    }
  },
  onDestroy(context) {
    if (context.data.unsub) {
      context.data.unsub()
      context.data.unsub = undefined
    }
  },
}

export function createClockNode(
  options: Partial<NodeInitOptions<ClockInputSchema, ClockOutputSchema, ClockData>> = {},
) {
  return new BaseNode({ ...clockNodeConfig, ...options })
}
