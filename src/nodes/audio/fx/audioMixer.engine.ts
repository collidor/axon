// oxlint-disable typescript/no-explicit-any
import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../../core/base.node'
import { AUDIO_NODE_TYPES } from '../audioNodes.constants'
import { AudioDriverManager } from '../driver/audioDriver'

export const audioMixerDataSchema = s.struct({
  gain1: s.number().min(0).max(2).default(1.0),
  gain2: s.number().min(0).max(2).default(1.0),
  gain3: s.number().min(0).max(2).default(1.0),
  gain4: s.number().min(0).max(2).default(1.0),
  master: s.number().min(0).max(2).default(1.0),
})

export type AudioMixerData = {
  gain1?: number
  gain2?: number
  gain3?: number
  gain4?: number
  master?: number
  [key: string]: unknown
}

export type AudioMixerInputs = {
  in1: typeof String
  in2: typeof String
  in3: typeof String
  in4: typeof String
  gain1: typeof Number
  gain2: typeof Number
  gain3: typeof Number
  gain4: typeof Number
  master: typeof Number
}

export type AudioMixerOutputs = {
  audioOut: typeof String
  activeChannels: typeof Number
}

export class AudioMixerNodeEngine extends BaseNode<
  AudioMixerInputs,
  AudioMixerOutputs,
  AudioMixerData
> {
  private outputGain: any
  private channelGains: any[] = []
  private connectedSources: (any | null)[] = [null, null, null, null]
  private driver = AudioDriverManager.get()

  constructor(
    options: Partial<
      NodeInitOptions<AudioMixerInputs, AudioMixerOutputs, AudioMixerData>
    > = {},
  ) {
    const initialData: AudioMixerData = {
      gain1: options.initialData?.gain1 ?? 1.0,
      gain2: options.initialData?.gain2 ?? 1.0,
      gain3: options.initialData?.gain3 ?? 1.0,
      gain4: options.initialData?.gain4 ?? 1.0,
      master: options.initialData?.master ?? 1.0,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.AUDIO_MIXER,
      dataSchema: audioMixerDataSchema,
      inputs: options.inputs ?? {
        in1: String,
        in2: String,
        in3: String,
        in4: String,
        gain1: Number,
        gain2: Number,
        gain3: Number,
        gain4: Number,
        master: Number,
      },
      outputs: options.outputs ?? {
        audioOut: String,
        activeChannels: Number,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        const engine = ctx.node as AudioMixerNodeEngine
        if (name === 'in1') engine.connectChannel(0, value)
        else if (name === 'in2') engine.connectChannel(1, value)
        else if (name === 'in3') engine.connectChannel(2, value)
        else if (name === 'in4') engine.connectChannel(3, value)
        engine.updateGains()
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
      onInputDisconnect: (name, ctx) => {
        const engine = ctx.node as AudioMixerNodeEngine
        if (name === 'in1') engine.disconnectChannel(0)
        else if (name === 'in2') engine.disconnectChannel(1)
        else if (name === 'in3') engine.disconnectChannel(2)
        else if (name === 'in4') engine.disconnectChannel(3)
        if (options.onInputDisconnect) {
          options.onInputDisconnect(name, ctx)
        }
      },
      onOutputDisconnect: (name, ctx) => {
        if (name === 'audioOut') {
          ;(ctx.node as AudioMixerNodeEngine).disconnectAudioOutput()
        }
        if (options.onOutputDisconnect) {
          options.onOutputDisconnect(name, ctx)
        }
      },
      onDestroy: () => {
        const busId = this.getOutputs().audioOut || `audio-mixer-${this.id || 'main'}`
        if (busId) {
          this.driver.unregisterBus(busId)
        }
        this.disconnectAudioOutput()
        for (let i = 0; i < 4; i++) {
          this.disconnectChannel(i)
        }
        try {
          this.channelGains.forEach((g) => g?.disconnect?.())
          this.outputGain?.disconnect?.()
        } catch {
          // ignore
        }
      },
    })

    this.initAudioNodes()
  }

  private initAudioNodes(): void {
    const ctx = this.driver.getContext()
    this.outputGain = ctx.createGain()
    this.channelGains = [
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
    ]

    for (let i = 0; i < 4; i++) {
      this.channelGains[i].connect(this.outputGain)
    }

    const busId = `audio-mixer-${this.id || 'main'}`
    this.driver.registerBus(busId, this.outputGain)

    this.updateGains()
    this.emitOutput('audioOut', busId)
    this.emitActiveChannels()
  }

  public connectChannel(channelIndex: number, sourceVal: any): void {
    if (channelIndex < 0 || channelIndex >= 4) return
    this.disconnectChannel(channelIndex)
    if (!sourceVal) return

    let sourceNode: any = null
    if (typeof sourceVal === 'string') {
      sourceNode = this.driver.getBus(sourceVal)
    } else if (sourceVal && typeof sourceVal.connect === 'function') {
      sourceNode = sourceVal
    }

    const channelGain = this.channelGains[channelIndex]
    if (sourceNode && typeof sourceNode.connect === 'function' && channelGain) {
      try {
        sourceNode.connect(channelGain)
      } catch {
        // ignore
      }
    }

    this.connectedSources[channelIndex] = sourceNode || sourceVal
    this.emitActiveChannels()
  }

  public disconnectChannel(channelIndex: number): void {
    if (channelIndex < 0 || channelIndex >= 4) return
    const source = this.connectedSources[channelIndex]
    const channelGain = this.channelGains[channelIndex]

    if (source && typeof source.disconnect === 'function' && channelGain) {
      try {
        source.disconnect(channelGain)
      } catch {
        // ignore
      }
    }
    this.connectedSources[channelIndex] = null
    this.emitActiveChannels()
  }

  public updateGains(): void {
    const inputs = this.getInputs()
    const masterVal = Number(inputs.master ?? this.data.master ?? 1.0)
    const g1 = Number(inputs.gain1 ?? this.data.gain1 ?? 1.0)
    const g2 = Number(inputs.gain2 ?? this.data.gain2 ?? 1.0)
    const g3 = Number(inputs.gain3 ?? this.data.gain3 ?? 1.0)
    const g4 = Number(inputs.gain4 ?? this.data.gain4 ?? 1.0)

    const gains = [g1, g2, g3, g4]
    for (let i = 0; i < 4; i++) {
      if (this.channelGains[i]?.gain) {
        this.channelGains[i].gain.value = Math.max(0, gains[i])
      }
    }

    if (this.outputGain?.gain) {
      this.outputGain.gain.value = Math.max(0, masterVal)
    }
  }

  private emitActiveChannels(): void {
    const active = this.connectedSources.filter(Boolean).length
    this.emitOutput('activeChannels', active)
  }

  public disconnectAudioOutput(): void {
    try {
      this.outputGain?.disconnect?.()
    } catch {
      // ignore
    }
  }

  public getChannelGainNode(index: number): any {
    return this.channelGains[index]
  }

  public getOutputNode(): any {
    return this.outputGain
  }
}

export function createAudioMixerNode(
  options: Partial<
    NodeInitOptions<AudioMixerInputs, AudioMixerOutputs, AudioMixerData>
  > = {},
) {
  return new AudioMixerNodeEngine(options)
}

export const createAudioCombinerNode = createAudioMixerNode
