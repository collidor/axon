import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import { bjorklund } from './pattern/pattern'

export const euclideanDataSchema = s.struct({
  hits: s.number().min(0).default(3),
  steps: s.number().min(1).default(8),
  rotate: s.number().default(0),
})

export type EuclideanData = {
  hits?: number
  steps?: number
  rotate?: number
  [key: string]: unknown
}

export type EuclideanInputs = {
  hits: typeof Number
  steps: typeof Number
  rotate: typeof Number
  clock: typeof Boolean
  step: typeof Number
}

export type EuclideanOutputs = {
  trigger: typeof Boolean
  pattern: null
  stepIndex: typeof Number
}

export class EuclideanRhythmNodeEngine extends BaseNode<
  EuclideanInputs,
  EuclideanOutputs,
  EuclideanData
> {
  private currentStep = 0

  constructor(
    options: Partial<
      NodeInitOptions<EuclideanInputs, EuclideanOutputs, EuclideanData>
    > = {},
  ) {
    const initialData: EuclideanData = {
      hits: options.initialData?.hits ?? 3,
      steps: options.initialData?.steps ?? 8,
      rotate: options.initialData?.rotate ?? 0,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.EUCLIDEAN,
      dataSchema: euclideanDataSchema,
      inputs: options.inputs ?? {
        hits: Number,
        steps: Number,
        rotate: Number,
        clock: Boolean,
        step: Number,
      },
      outputs: options.outputs ?? {
        trigger: Boolean,
        pattern: null,
        stepIndex: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'hits' || name === 'steps' || name === 'rotate') {
          ;(ctx.node as EuclideanRhythmNodeEngine).emitPattern()
        } else if (name === 'clock' && Boolean(value)) {
          ;(ctx.node as EuclideanRhythmNodeEngine).advanceStep()
        } else if (name === 'step' && typeof value === 'number') {
          ;(ctx.node as EuclideanRhythmNodeEngine).setStep(Math.floor(value))
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })

    this.emitPattern()
  }

  public getPattern(): boolean[] {
    const inputs = this.getInputs()
    const hits = typeof inputs.hits === 'number' ? inputs.hits : (this.data.hits ?? 3)
    const steps = typeof inputs.steps === 'number' ? inputs.steps : (this.data.steps ?? 8)
    const rotate = typeof inputs.rotate === 'number' ? inputs.rotate : (this.data.rotate ?? 0)

    const raw = bjorklund(hits, steps)
    if (steps <= 0) return []
    const rot = ((rotate % steps) + steps) % steps
    if (rot === 0) return raw

    // Rotate pattern by offset
    return [...raw.slice(steps - rot), ...raw.slice(0, steps - rot)]
  }

  private emitPattern(): void {
    const pat = this.getPattern()
    this.emitOutput('pattern', pat)
  }

  public advanceStep(): boolean {
    const pat = this.getPattern()
    const steps = pat.length || 1
    this.currentStep = (this.currentStep + 1) % steps
    const isHit = Boolean(pat[this.currentStep])

    this.emitOutput('stepIndex', this.currentStep)
    this.emitOutput('trigger', isHit)
    return isHit
  }

  public setStep(step: number): boolean {
    const pat = this.getPattern()
    const steps = pat.length || 1
    this.currentStep = ((step % steps) + steps) % steps
    const isHit = Boolean(pat[this.currentStep])

    this.emitOutput('stepIndex', this.currentStep)
    this.emitOutput('trigger', isHit)
    return isHit
  }
}

export function createEuclideanNode(
  options: Partial<
    NodeInitOptions<EuclideanInputs, EuclideanOutputs, EuclideanData>
  > = {},
) {
  return new EuclideanRhythmNodeEngine(options)
}

export { EuclideanRhythmNodeEngine as EuclideanNodeEngine }

