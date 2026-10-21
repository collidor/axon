// oxlint-disable typescript/no-explicit-any
import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../../core/base.node'
import { AUDIO_NODE_TYPES } from '../audioNodes.constants'
import { AudioDriverManager } from '../driver/audioDriver'

export const reverbDataSchema = s.struct({
  roomSize: s.number().min(0.1).max(10).default(2.5),
  damp: s.number().min(0).max(1).default(0.5),
  mix: s.number().min(0).max(1).default(0.3),
})

export type ReverbData = {
  roomSize?: number
  damp?: number
  mix?: number
  [key: string]: unknown
}

export type ReverbInputs = {
  audioIn: typeof String
  roomSize: typeof Number
  damp: typeof Number
  mix: typeof Number
}

export type ReverbOutputs = {
  audioOut: typeof String
}

export class ReverbNodeEngine extends BaseNode<ReverbInputs, ReverbOutputs, ReverbData> {
  private inputNode: any
  private outputNode: any
  private convolver: any
  private wetGain: any
  private dryGain: any
  private driver = AudioDriverManager.get()

  constructor(
    options: Partial<NodeInitOptions<ReverbInputs, ReverbOutputs, ReverbData>> = {},
  ) {
    const initialData: ReverbData = {
      roomSize: options.initialData?.roomSize ?? 2.5,
      damp: options.initialData?.damp ?? 0.5,
      mix: options.initialData?.mix ?? 0.3,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.REVERB,
      dataSchema: reverbDataSchema,
      inputs: options.inputs ?? {
        audioIn: String,
        roomSize: Number,
        damp: Number,
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
        const engine = ctx.node as ReverbNodeEngine
        if (name === 'audioIn') {
          engine.connectAudioInput(value)
        }
        engine.updateMix()
        if (name === 'roomSize' || name === 'damp') {
          engine.rebuildImpulse()
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
      onPortConnect: (portName, value, fromPortId, ctx) => {
        const engine = ctx.node as ReverbNodeEngine
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
          ;(ctx.node as ReverbNodeEngine).disconnectAudioInput()
        }
        if (options.onPortDisconnect) {
          options.onPortDisconnect(portName, removedValue, fromPortId, ctx)
        }
      },
      onOutputDisconnect: (name, ctx) => {
        if (name === 'audioOut') {
          ;(ctx.node as ReverbNodeEngine).disconnectAudioOutput()
        }
        if (options.onOutputDisconnect) {
          options.onOutputDisconnect(name, ctx)
        }
      },
      onDestroy: () => {
        const busId = this.getOutputs().audioOut || `audio-reverb-${this.id || 'main'}`
        if (busId) {
          this.driver.unregisterBus(busId)
        }
        this.disconnectAudioOutput()
        this.disconnectAudioInput()
        try {
          this.inputNode?.disconnect?.()
          this.convolver?.disconnect?.()
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
    this.convolver = ctx.createConvolver()
    this.wetGain = ctx.createGain()
    this.dryGain = ctx.createGain()

    // Dry path
    this.inputNode.connect(this.dryGain)
    this.dryGain.connect(this.outputNode)

    // Wet path
    this.inputNode.connect(this.convolver)
    this.convolver.connect(this.wetGain)
    this.wetGain.connect(this.outputNode)

    const busId = `audio-reverb-${this.id || 'main'}`
    this.driver.registerBus(busId, this.outputNode)

    this.rebuildImpulse()
    this.updateMix()
    this.emitOutput('audioOut', busId)
  }

  private rebuildImpulse(): void {
    const ctx = this.driver.getContext()
    const rate = ctx.sampleRate || 44100
    const room = Number(this.getInputs().roomSize || this.data.roomSize || 2.5)
    const length = Math.max(1, Math.floor(rate * room))

    try {
      const impulse = ctx.createBuffer(2, length, rate)
      const left = impulse.getChannelData(0)
      const right = impulse.getChannelData(1)
      const damp = Number(this.getInputs().damp ?? this.data.damp ?? 0.5)

      for (let i = 0; i < length; i++) {
        const decay = Math.exp((-i / (rate * (1 - damp * 0.5))) * 3)
        left[i] = (Math.random() * 2 - 1) * decay
        right[i] = (Math.random() * 2 - 1) * decay
      }
      this.convolver.buffer = impulse
    } catch {
      // ignore
    }
  }

  public updateMix(): void {
    const mixVal = Number(this.getInputs().mix ?? this.data.mix ?? 0.3)
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

export function createReverbNode(
  options: Partial<NodeInitOptions<ReverbInputs, ReverbOutputs, ReverbData>> = {},
) {
  return new ReverbNodeEngine(options)
}
