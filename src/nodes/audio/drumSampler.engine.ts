// oxlint-disable typescript/no-explicit-any
import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import type { AudioEvent } from './audio.types'
import { AudioDriverManager } from './driver/audioDriver'

export const drumSamplerDataSchema = s.struct({
  volume: s.number().min(0).max(1).default(0.85),
})

export type DrumSamplerData = {
  volume?: number
  sampleUrls?: Record<string, string>
  [key: string]: unknown
}

export type DrumSamplerInputs = {
  events: null
  trigger: typeof Boolean
  sound: typeof String
  volume: typeof Number
}

export type DrumSamplerOutputs = {
  audioOut: typeof String
  lastTrigger: typeof String
}

export class DrumSamplerNodeEngine extends BaseNode<
  DrumSamplerInputs,
  DrumSamplerOutputs,
  DrumSamplerData
> {
  private outputGain: any
  private driver = AudioDriverManager.get()
  private sampleCache = new Map<string, any>()
  private noiseBuffer: any = null

  constructor(
    options: Partial<
      NodeInitOptions<DrumSamplerInputs, DrumSamplerOutputs, DrumSamplerData>
    > = {},
  ) {
    const initialData: DrumSamplerData = {
      volume: options.initialData?.volume ?? 0.85,
      sampleUrls: options.initialData?.sampleUrls ?? {},
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.DRUM_SAMPLER,
      dataSchema: drumSamplerDataSchema,
      inputs: options.inputs ?? {
        events: null,
        trigger: Boolean,
        sound: String,
        volume: Number,
      },
      outputs: options.outputs ?? {
        audioOut: String,
        lastTrigger: String,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'events' && Array.isArray(value)) {
          ;(ctx.node as DrumSamplerNodeEngine).playEvents(value as AudioEvent[])
        } else if (name === 'trigger' && Boolean(value)) {
          const snd = (ctx.node as DrumSamplerNodeEngine).getInputs().sound || 'bd'
          ;(ctx.node as DrumSamplerNodeEngine).triggerSound(String(snd))
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
      onOutputDisconnect: (name, ctx) => {
        if (name === 'audioOut') {
          ;(ctx.node as DrumSamplerNodeEngine).disconnectAudioOutput()
        }
        if (options.onOutputDisconnect) {
          options.onOutputDisconnect(name, ctx)
        }
      },
      onDestroy: () => {
        const busId = this.getOutputs().audioOut || `audio-bus-drums-${this.id || 'main'}`
        if (busId) {
          this.driver.unregisterBus(busId)
        }
        this.disconnectAudioOutput()
      },
    })

    this.initAudioNodes()
  }

  private initAudioNodes(): void {
    const ctx = this.driver.getContext()
    this.outputGain = ctx.createGain()

    // Generate 1-second white noise buffer for snares, hats, claps
    try {
      const length = ctx.sampleRate ? Math.floor(ctx.sampleRate * 1.0) : 44100
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate || 44100)
      const output = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        output[i] = Math.random() * 2 - 1
      }
    } catch {
      // null driver fallback
    }

    const busId = `audio-bus-drums-${this.id || 'main'}`
    this.driver.registerBus(busId, this.outputGain)
    this.emitOutput('audioOut', busId)
  }

  public disconnectAudioOutput(): void {
    try {
      this.outputGain?.disconnect?.()
    } catch {
      // ignore
    }
  }

  public playEvents(events: AudioEvent[]): void {
    for (const ev of events) {
      const soundId = ev.note || 'bd'
      this.triggerSound(soundId, ev.time, ev.velocity ?? 0.85)
    }
  }

  public triggerSound(soundId: string, time?: number, velocity: number = 0.85): void {
    const ctx = this.driver.getContext()
    const ctxNow = ctx?.currentTime ?? 0
    const rawTime = time !== undefined ? time : ctxNow
    const t = Math.max(0, ctxNow, Number.isFinite(rawTime) ? rawTime : ctxNow)
    const key = soundId.toLowerCase().trim()

    this.emitOutput('lastTrigger', key)

    // Check custom sample buffer first
    if (this.sampleCache.has(key)) {
      this.playBuffer(this.sampleCache.get(key), t, velocity)
      return
    }

    // Synthesized 808 percussion models
    switch (key) {
      case 'bd':
      case 'kick':
      case '808_bd':
        this.synthesizeKick(t, velocity)
        break
      case 'sd':
      case 'snare':
      case '808_sd':
        this.synthesizeSnare(t, velocity)
        break
      case 'hh':
      case 'hat':
      case 'ch':
      case '808_hh':
        this.synthesizeHiHat(t, velocity, false)
        break
      case 'oh':
      case 'open_hat':
      case '808_oh':
        this.synthesizeHiHat(t, velocity, true)
        break
      case 'cp':
      case 'clap':
      case '808_cp':
        this.synthesizeClap(t, velocity)
        break
      case 'rim':
      case 'cb':
      case 'cowbell':
        this.synthesizeCowbell(t, velocity)
        break
      default:
        // Default to kick if unknown drum tag
        this.synthesizeKick(t, velocity)
        break
    }
  }

  private synthesizeKick(time: number, velocity: number): void {
    const ctx = this.driver.getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(this.outputGain)

    // Pitch sweep 160Hz -> 38Hz
    if (osc.frequency && typeof osc.frequency.setValueAtTime === 'function') {
      osc.frequency.setValueAtTime(160, time)
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.08)
    }

    if (gain.gain && typeof gain.gain.setValueAtTime === 'function') {
      gain.gain.setValueAtTime(velocity, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35)
    }

    if (typeof osc.start === 'function') {
      try {
        osc.start(time)
        osc.stop(time + 0.4)
      } catch {
        // ignore
      }
    }
  }

  private synthesizeSnare(time: number, velocity: number): void {
    const ctx = this.driver.getContext()

    // Tone layer
    const toneOsc = ctx.createOscillator()
    const toneGain = ctx.createGain()
    toneOsc.connect(toneGain)
    toneGain.connect(this.outputGain)

    if (toneOsc.frequency && typeof toneOsc.frequency.setValueAtTime === 'function') {
      toneOsc.frequency.setValueAtTime(185, time)
      toneOsc.frequency.exponentialRampToValueAtTime(70, time + 0.1)
    }
    if (toneGain.gain && typeof toneGain.gain.setValueAtTime === 'function') {
      toneGain.gain.setValueAtTime(velocity * 0.7, time)
      toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15)
    }

    // Noise layer
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource()
      noise.buffer = this.noiseBuffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 1000

      const noiseGain = ctx.createGain()
      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.outputGain)

      if (noiseGain.gain && typeof noiseGain.gain.setValueAtTime === 'function') {
        noiseGain.gain.setValueAtTime(velocity * 0.8, time)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
      }

      if (typeof noise.start === 'function') {
        try {
          noise.start(time)
          noise.stop(time + 0.22)
          toneOsc.start(time)
          toneOsc.stop(time + 0.22)
        } catch {
          // ignore
        }
      }
    }
  }

  private synthesizeHiHat(time: number, velocity: number, open: boolean): void {
    const ctx = this.driver.getContext()
    if (!this.noiseBuffer) return

    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 7500

    const gain = ctx.createGain()
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.outputGain)

    const decay = open ? 0.35 : 0.05
    if (gain.gain && typeof gain.gain.setValueAtTime === 'function') {
      gain.gain.setValueAtTime(velocity * 0.75, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + decay)
    }

    if (typeof noise.start === 'function') {
      try {
        noise.start(time)
        noise.stop(time + decay + 0.02)
      } catch {
        // ignore
      }
    }
  }

  private synthesizeClap(time: number, velocity: number): void {
    const ctx = this.driver.getContext()
    if (!this.noiseBuffer) return

    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 2.0

    const gain = ctx.createGain()
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.outputGain)

    if (gain.gain && typeof gain.gain.setValueAtTime === 'function') {
      // 3 micro-bursts followed by diffuse tail
      gain.gain.setValueAtTime(velocity * 0.7, time)
      gain.gain.setValueAtTime(velocity * 0.7, time + 0.012)
      gain.gain.setValueAtTime(velocity * 0.8, time + 0.024)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22)
    }

    if (typeof noise.start === 'function') {
      try {
        noise.start(time)
        noise.stop(time + 0.25)
      } catch {
        // ignore
      }
    }
  }

  private synthesizeCowbell(time: number, velocity: number): void {
    const ctx = this.driver.getContext()
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    osc1.type = 'square'
    osc2.type = 'square'
    osc1.frequency.value = 560
    osc2.frequency.value = 845

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 800

    const gain = ctx.createGain()
    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.outputGain)

    if (gain.gain && typeof gain.gain.setValueAtTime === 'function') {
      gain.gain.setValueAtTime(velocity * 0.6, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
    }

    if (typeof osc1.start === 'function') {
      try {
        osc1.start(time)
        osc2.start(time)
        osc1.stop(time + 0.32)
        osc2.stop(time + 0.32)
      } catch {
        // ignore
      }
    }
  }

  private playBuffer(buffer: any, time: number, velocity: number): void {
    const ctx = this.driver.getContext()
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = velocity
    src.connect(gain)
    gain.connect(this.outputGain)

    if (typeof src.start === 'function') {
      try {
        src.start(time)
      } catch {
        // ignore
      }
    }
  }

  public registerSampleBuffer(name: string, buffer: any): void {
    this.sampleCache.set(name.toLowerCase().trim(), buffer)
  }

  public getOutputNode(): any {
    return this.outputGain
  }
}

export function createDrumSamplerNode(
  options: Partial<
    NodeInitOptions<DrumSamplerInputs, DrumSamplerOutputs, DrumSamplerData>
  > = {},
) {
  return new DrumSamplerNodeEngine(options)
}
