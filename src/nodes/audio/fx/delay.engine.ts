// oxlint-disable typescript/no-explicit-any
import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../../core/base.node'
import { AUDIO_NODE_TYPES } from '../audioNodes.constants'
import { AudioDriverManager } from '../driver/audioDriver'

export const delayDataSchema = s.struct({
  time: s.number().min(0.01).max(2).default(0.375), // dotted eighth note at 120bpm
  feedback: s.number().min(0).max(0.95).default(0.4),
  mix: s.number().min(0).max(1).default(0.35),
})

export type DelayData = {
  time?: number
  feedback?: number
  mix?: number
  [key: string]: unknown
}

export type DelayInputs = {
  audioIn: typeof String
  time: typeof Number
  feedback: typeof Number
  mix: typeof Number
}

export type DelayOutputs = {
  audioOut: typeof String
}

export class DelayNodeEngine extends BaseNode<DelayInputs, DelayOutputs, DelayData> {
  private inputNode: any
  private outputNode: any
  private delayNode: any
  private feedbackGain: any
  private wetGain: any
  private dryGain: any
  private driver = AudioDriverManager.get()

  constructor(
    options: Partial<NodeInitOptions<DelayInputs, DelayOutputs, DelayData>> = {},
  ) {
    const initialData: DelayData = {
      time: options.initialData?.time ?? 0.375,
      feedback: options.initialData?.feedback ?? 0.4,
      mix: options.initialData?.mix ?? 0.35,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.DELAY,
      dataSchema: delayDataSchema,
      inputs: options.inputs ?? {
        audioIn: String,
        time: Number,
        feedback: Number,
        mix: Number,
      },
      outputs: options.outputs ?? {
        audioOut: String,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        const engine = ctx.node as DelayNodeEngine
        if (name === 'audioIn') {
          engine.connectAudioInput(value)
        }
        engine.updateParams()
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
      onPortConnect: (portName, value, fromPortId, ctx) => {
        const engine = ctx.node as DelayNodeEngine
        if (portName === 'audioIn') {
          const sourceVal = value ?? ctx.node.graph?.getNode?.(fromPortId.split(':')[0])
          engine.connectAudioInput(sourceVal)
        }
        if (options.onPortConnect) {
          options.onPortConnect(portName, value, fromPortId, ctx)
        }
      },
      onPortDisconnect: (portName, removedValue, fromPortId, ctx) => {
        if (portName === 'audioIn') {
          ;(ctx.node as DelayNodeEngine).disconnectAudioInput()
        }
        if (options.onPortDisconnect) {
          options.onPortDisconnect(portName, removedValue, fromPortId, ctx)
        }
      },
      onOutputDisconnect: (name, ctx) => {
        if (name === 'audioOut') {
          ;(ctx.node as DelayNodeEngine).disconnectAudioOutput()
        }
        if (options.onOutputDisconnect) {
          options.onOutputDisconnect(name, ctx)
        }
      },
      onDestroy: () => {
        const busId = this.getOutputs().audioOut || `audio-delay-${this.id || 'main'}`
        if (busId) {
          this.driver.unregisterBus(busId)
        }
        this.disconnectAudioOutput()
        this.disconnectAudioInput()
        try {
          this.inputNode?.disconnect?.()
          this.delayNode?.disconnect?.()
          this.feedbackGain?.disconnect?.()
          this.wetGain?.disconnect?.()
          this.dryGain?.disconnect?.()
          this.outputNode?.disconnect?.()
        } catch {
          // ignore
        }
      },
    })

    this.initAudioNodes()
  }

  private connectedSourceNode: any = null

  public connectAudioInput(sourceVal: any): void {
    this.disconnectAudioInput()
    if (!sourceVal) return

    let sourceNode: any = null
    if (typeof sourceVal === 'string') {
      sourceNode = this.driver.getBus(sourceVal)
    } else if (sourceVal && typeof sourceVal.connect === 'function') {
      sourceNode = sourceVal
    }

    if (sourceNode && typeof sourceNode.connect === 'function' && this.inputNode) {
      try {
        sourceNode.connect(this.inputNode)
        this.connectedSourceNode = sourceNode
      } catch {
        // ignore
      }
    }
    this.updateParams()
  }

  public disconnectAudioInput(): void {
    if (this.connectedSourceNode && this.inputNode) {
      try {
        if (typeof this.connectedSourceNode.disconnect === 'function') {
          this.connectedSourceNode.disconnect(this.inputNode)
        }
      } catch {
        // ignore
      }
      this.connectedSourceNode = null
    }

    // Drain feedback loop so lingering disconnected echoes do not persist
    if (this.feedbackGain?.gain) {
      this.feedbackGain.gain.value = 0
    }
  }

  public disconnectAudioOutput(): void {
    try {
      this.outputNode?.disconnect?.()
    } catch {
      // ignore
    }
  }

  private initAudioNodes(): void {
    const ctx = this.driver.getContext()
    this.inputNode = ctx.createGain()
    this.outputNode = ctx.createGain()
    this.delayNode = ctx.createDelay(5.0)
    this.feedbackGain = ctx.createGain()
    this.wetGain = ctx.createGain()
    this.dryGain = ctx.createGain()

    // Dry path
    this.inputNode.connect(this.dryGain)
    this.dryGain.connect(this.outputNode)

    // Wet delay feedback loop
    this.inputNode.connect(this.delayNode)
    this.delayNode.connect(this.wetGain)
    this.wetGain.connect(this.outputNode)

    this.delayNode.connect(this.feedbackGain)
    this.feedbackGain.connect(this.delayNode)

    const busId = `audio-delay-${this.id || 'main'}`
    this.driver.registerBus(busId, this.outputNode)

    this.updateParams()
    this.emitOutput('audioOut', busId)
  }

  public updateParams(): void {
    const inputs = this.getInputs()
    const timeVal = Number(inputs.time || this.data.time || 0.375)
    const feedbackVal = Number(inputs.feedback ?? this.data.feedback ?? 0.4)
    const mixVal = Number(inputs.mix ?? this.data.mix ?? 0.35)

    if (this.delayNode?.delayTime) {
      this.delayNode.delayTime.value = timeVal
    }
    if (this.feedbackGain?.gain) {
      this.feedbackGain.gain.value = Math.min(0.95, Math.max(0, feedbackVal))
    }
    if (this.wetGain?.gain) {
      this.wetGain.gain.value = mixVal
    }
    if (this.dryGain?.gain) {
      this.dryGain.gain.value = 1 - mixVal
    }
  }

  public getInputNode(): any {
    return this.inputNode
  }

  public getOutputNode(): any {
    return this.outputNode
  }
}

export function createAudioDelayNode(
  options: Partial<NodeInitOptions<DelayInputs, DelayOutputs, DelayData>> = {},
) {
  return new DelayNodeEngine(options)
}

export const createDelayEffectNode = createAudioDelayNode
export const createDelayNode = createAudioDelayNode
