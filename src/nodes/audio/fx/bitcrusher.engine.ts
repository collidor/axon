// oxlint-disable typescript/no-explicit-any
import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../../core/base.node'
import { AUDIO_NODE_TYPES } from '../audioNodes.constants'
import { AudioDriverManager } from '../driver/audioDriver'

export const bitcrusherDataSchema = s.struct({
  bits: s.number().min(1).max(16).default(8),
  drive: s.number().min(1).max(10).default(1),
  mix: s.number().min(0).max(1).default(0.5),
})

export type BitcrusherData = {
  bits?: number
  drive?: number
  mix?: number
  [key: string]: unknown
}

export type BitcrusherInputs = {
  audioIn: typeof String
  bits: typeof Number
  drive: typeof Number
  mix: typeof Number
}

export type BitcrusherOutputs = {
  audioOut: typeof String
}

export class BitcrusherNodeEngine extends BaseNode<
  BitcrusherInputs,
  BitcrusherOutputs,
  BitcrusherData
> {
  private inputNode: any
  private outputNode: any
  private shaper: any
  private wetGain: any
  private dryGain: any
  private driver = AudioDriverManager.get()

  constructor(
    options: Partial<
      NodeInitOptions<BitcrusherInputs, BitcrusherOutputs, BitcrusherData>
    > = {},
  ) {
    const initialData: BitcrusherData = {
      bits: options.initialData?.bits ?? 8,
      drive: options.initialData?.drive ?? 1,
      mix: options.initialData?.mix ?? 0.5,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.BITCRUSHER,
      dataSchema: bitcrusherDataSchema,
      inputs: options.inputs ?? {
        audioIn: String,
        bits: Number,
        drive: Number,
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
        const engine = ctx.node as BitcrusherNodeEngine
        if (name === 'audioIn') {
          engine.connectAudioInput(value)
        }
        engine.updateMix()
        if (name === 'bits' || name === 'drive') {
          engine.rebuildCurve()
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
      onPortConnect: (portName, value, fromPortId, ctx) => {
        const engine = ctx.node as BitcrusherNodeEngine
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
          ;(ctx.node as BitcrusherNodeEngine).disconnectAudioInput()
        }
        if (options.onPortDisconnect) {
          options.onPortDisconnect(portName, removedValue, fromPortId, ctx)
        }
      },
      onOutputDisconnect: (name, ctx) => {
        if (name === 'audioOut') {
          ;(ctx.node as BitcrusherNodeEngine).disconnectAudioOutput()
        }
        if (options.onOutputDisconnect) {
          options.onOutputDisconnect(name, ctx)
        }
      },
      onDestroy: () => {
        const busId = this.getOutputs().audioOut || `audio-bitcrusher-${this.id || 'main'}`
        if (busId) {
          this.driver.unregisterBus(busId)
        }
        this.disconnectAudioOutput()
        this.disconnectAudioInput()
        try {
          this.inputNode?.disconnect?.()
          this.shaper?.disconnect?.()
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
    this.shaper = ctx.createWaveShaper()
    this.wetGain = ctx.createGain()
    this.dryGain = ctx.createGain()

    // Dry path
    this.inputNode.connect(this.dryGain)
    this.dryGain.connect(this.outputNode)

    // Wet path
    this.inputNode.connect(this.shaper)
    this.shaper.connect(this.wetGain)
    this.wetGain.connect(this.outputNode)

    const busId = `audio-bitcrusher-${this.id || 'main'}`
    this.driver.registerBus(busId, this.outputNode)

    this.rebuildCurve()
    this.updateMix()
    this.emitOutput('audioOut', busId)
  }

  private rebuildCurve(): void {
    const bits = Number(this.getInputs().bits || this.data.bits || 8)
    const drive = Number(this.getInputs().drive || this.data.drive || 1)
    const steps = Math.pow(2, bits)

    const samples = 1024
    const curve = new Float32Array(samples)

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      const driven = Math.max(-1, Math.min(1, x * drive))
      // Quantize to bit depth steps
      curve[i] = Math.round(driven * steps) / steps
    }

    if (this.shaper) {
      this.shaper.curve = curve
    }
  }

  public updateMix(): void {
    const mixVal = Number(this.getInputs().mix ?? this.data.mix ?? 0.5)
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

export function createBitcrusherNode(
  options: Partial<
    NodeInitOptions<BitcrusherInputs, BitcrusherOutputs, BitcrusherData>
  > = {},
) {
  return new BitcrusherNodeEngine(options)
}
