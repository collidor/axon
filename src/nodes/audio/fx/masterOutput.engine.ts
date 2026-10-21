// oxlint-disable typescript/no-explicit-any
import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../../core/base.node'
import { AUDIO_NODE_TYPES } from '../audioNodes.constants'
import { AudioDriverManager } from '../driver/audioDriver'

export const masterOutputDataSchema = s.struct({
  volume: s.number().min(0).max(1).default(0.8),
  muted: s.boolean().default(false),
})

export type MasterOutputData = {
  volume?: number
  muted?: boolean
  [key: string]: unknown
}

export type MasterOutputInputs = {
  audioIn: typeof String
  volume: typeof Number
  mute: typeof Boolean
}

export type MasterOutputOutputs = {
  analyser: null
  currentVolume: typeof Number
}

export class MasterOutputNodeEngine extends BaseNode<
  MasterOutputInputs,
  MasterOutputOutputs,
  MasterOutputData
> {
  private masterGain: any
  private analyser: any
  private driver = AudioDriverManager.get()

  constructor(
    options: Partial<
      NodeInitOptions<MasterOutputInputs, MasterOutputOutputs, MasterOutputData>
    > = {},
  ) {
    const initialData: MasterOutputData = {
      volume: options.initialData?.volume ?? 0.8,
      muted: options.initialData?.muted ?? false,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.MASTER_OUTPUT,
      dataSchema: masterOutputDataSchema,
      inputs: options.inputs ?? {
        audioIn: String,
        volume: Number,
        mute: Boolean,
      },
      outputs: options.outputs ?? {
        analyser: null,
        currentVolume: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        const engine = ctx.node as MasterOutputNodeEngine
        if (name === 'audioIn') {
          engine.connectAudioInput(value)
        }
        engine.updateVolume()
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
      onPortConnect: (portName, value, fromPortId, ctx) => {
        const engine = ctx.node as MasterOutputNodeEngine
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
          ;(ctx.node as MasterOutputNodeEngine).disconnectAudioInput()
        }
        if (options.onPortDisconnect) {
          options.onPortDisconnect(portName, removedValue, fromPortId, ctx)
        }
      },
      onDestroy: () => {
        this.disconnectAudioInput()
        try {
          this.masterGain?.disconnect?.()
          this.analyser?.disconnect?.()
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

    if (sourceNode && typeof sourceNode.connect === 'function' && this.masterGain) {
      try {
        sourceNode.connect(this.masterGain)
        this.connectedSourceNode = sourceNode
      } catch {
        // ignore
      }
    }
  }

  public disconnectAudioInput(): void {
    if (this.connectedSourceNode && this.masterGain) {
      try {
        if (typeof this.connectedSourceNode.disconnect === 'function') {
          this.connectedSourceNode.disconnect(this.masterGain)
        }
      } catch {
        // ignore
      }
      this.connectedSourceNode = null
    }
  }

  private initAudioNodes(): void {
    const ctx = this.driver.getContext()
    this.masterGain = ctx.createGain()
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048

    this.masterGain.connect(this.analyser)
    this.analyser.connect(ctx.destination)

    this.updateVolume()
    this.emitOutput('analyser', this.analyser)
  }

  public updateVolume(): void {
    const inputs = this.getInputs()
    const vol = Number(inputs.volume ?? this.data.volume ?? 0.8)
    const isMuted = inputs.mute !== undefined ? Boolean(inputs.mute) : Boolean(this.data.muted)

    const finalGain = isMuted ? 0 : Math.max(0, Math.min(1, vol))
    if (this.masterGain?.gain) {
      this.masterGain.gain.value = finalGain
    }

    this.emitOutput('currentVolume', finalGain)
  }

  public getAnalyserNode(): any {
    return this.analyser
  }

  public getInputNode(): any {
    return this.masterGain
  }
}

export function createMasterOutputNode(
  options: Partial<
    NodeInitOptions<MasterOutputInputs, MasterOutputOutputs, MasterOutputData>
  > = {},
) {
  return new MasterOutputNodeEngine(options)
}
