import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export interface FeedbackData {
  initial?: unknown
  label?: string
  maxIterations?: number
  [key: string]: unknown
}

export interface FeedbackState {
  currentValue: unknown
  nextValue: unknown
  hasReceivedInput: boolean
  stepCount: number
}

export type FeedbackInputs = {
  input: null
  initial: null
  step: typeof Boolean
  reset: typeof Boolean
}

export type FeedbackOutputs = {
  output: null
  previous: null
}

/**
 * Headless Feedback and Delay Node Engine.
 * Explicitly breaks synchronous execution cycles by latching incoming values
 * and yielding the previous tick/cycle's value on 'output'.
 */
export class FeedbackNodeEngine extends BaseNode<
  FeedbackInputs,
  FeedbackOutputs,
  FeedbackData,
  unknown,
  FeedbackState
> {
  readonly isFeedbackNode = true

  constructor(
    options: Partial<
      NodeInitOptions<FeedbackInputs, FeedbackOutputs, FeedbackData, unknown, FeedbackState>
    > = {},
    globalData?: unknown,
  ) {
    const initialData: FeedbackData = {
      initial: 0,
      label: 'Feedback Latch',
      maxIterations: 1000,
      ...options.initialData,
    }

    super(
      {
        nodeType: NODE_TYPES.FEEDBACK,
        inputs: {
          input: null,
          initial: null,
          step: Boolean,
          reset: Boolean,
          ...options.inputs,
        },
        outputs: {
          output: null,
          previous: null,
          ...options.outputs,
        },
        initialData,
        onInit(ctx) {
          const init = ctx.node.getInput('initial') ?? ctx.data.initial ?? 0
          ctx.state.currentValue = init
          ctx.state.nextValue = init
          ctx.state.hasReceivedInput = false
          ctx.state.stepCount = 0
          ctx.emitOutput('output', ctx.state.currentValue)
          ctx.emitOutput('previous', ctx.state.currentValue)
        },
        onInputChange(name, value, ctx) {
          const engine = ctx.node as FeedbackNodeEngine
          if (name === 'initial') {
            if (!ctx.state.hasReceivedInput) {
              ctx.state.currentValue = value
              ctx.state.nextValue = value
              ctx.emitOutput('output', ctx.state.currentValue)
              ctx.emitOutput('previous', ctx.state.currentValue)
            }
          } else if (name === 'reset') {
            if (Boolean(value)) {
              engine.reset()
            }
          } else if (name === 'step') {
            if (Boolean(value)) {
              engine.step()
            }
          } else if (name === 'input') {
            ctx.state.nextValue = value
            ctx.state.hasReceivedInput = true
          }
        },
        ...options,
      },
      globalData,
    )
  }

  /**
   * Advances the latch by one cycle:
   * Transfers nextValue -> currentValue, increments stepCount,
   * and emits output and previous.
   */
  public step(): unknown {
    const prev = this.state.currentValue
    this.state.currentValue = this.state.nextValue
    this.state.stepCount = (this.state.stepCount || 0) + 1
    this.emitOutput('previous', prev)
    this.emitOutput('output', this.state.currentValue)
    return this.state.currentValue
  }

  /**
   * Resets the latch back to its initial seed value.
   */
  public reset(): void {
    const init = this.getInput('initial') ?? this.data.initial ?? 0
    this.state.currentValue = init
    this.state.nextValue = init
    this.state.hasReceivedInput = false
    this.state.stepCount = 0
    this.emitOutput('output', this.state.currentValue)
    this.emitOutput('previous', this.state.currentValue)
  }
}

export function createFeedbackNode(
  options?: Partial<
    NodeInitOptions<FeedbackInputs, FeedbackOutputs, FeedbackData, unknown, FeedbackState>
  >,
  globalData?: unknown,
): FeedbackNodeEngine {
  return new FeedbackNodeEngine(options, globalData)
}
