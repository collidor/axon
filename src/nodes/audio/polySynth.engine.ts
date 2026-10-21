// oxlint-disable typescript/no-explicit-any
import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'
import { noteToFrequency, type AudioEvent } from './audio.types'
import { AudioDriverManager } from './driver/audioDriver'

export const polySynthDataSchema = s.struct({
  waveform: s.string().default('sawtooth'),
  attack: s.number().min(0.001).max(5).default(0.01),
  decay: s.number().min(0.01).max(5).default(0.15),
  sustain: s.number().min(0).max(1).default(0.6),
  release: s.number().min(0.01).max(10).default(0.3),
  cutoff: s.number().min(20).max(20000).default(2500),
  resonance: s.number().min(0.1).max(30).default(2.5),
  filterEnv: s.number().min(-20000).max(20000).default(0),
  maxVoices: s.number().min(1).max(32).default(16),
})

export type PolySynthData = {
  waveform?: 'sawtooth' | 'square' | 'sine' | 'triangle' | 'noise'
  attack?: number
  decay?: number
  sustain?: number
  release?: number
  cutoff?: number
  resonance?: number
  filterEnv?: number
  maxVoices?: number
  [key: string]: unknown
}

export type PolySynthInputs = {
  events: null
  trigger: typeof Boolean
  note: null
  waveform: typeof String
  attack: typeof Number
  decay: typeof Number
  sustain: typeof Number
  release: typeof Number
  cutoff: typeof Number
  resonance: typeof Number
  filterEnv: typeof Number
}

export type PolySynthOutputs = {
  audioOut: typeof String
  activeVoices: typeof Number
  lastEvent: null
}

interface SynthVoice {
  id: number
  osc: any
  oscGain: any
  noise: any
  noiseGain: any
  filter: any
  gain: any
  panner: any
  busyUntil: number
}

export class PolySynthNodeEngine extends BaseNode<
  PolySynthInputs,
  PolySynthOutputs,
  PolySynthData
> {
  private outputGain: any
  private voices: SynthVoice[] = []
  private driver = AudioDriverManager.get()

  constructor(
    options: Partial<
      NodeInitOptions<PolySynthInputs, PolySynthOutputs, PolySynthData>
    > = {},
  ) {
    const initialData: PolySynthData = {
      waveform: options.initialData?.waveform ?? 'sawtooth',
      attack: options.initialData?.attack ?? 0.01,
      decay: options.initialData?.decay ?? 0.15,
      sustain: options.initialData?.sustain ?? 0.6,
      release: options.initialData?.release ?? 0.3,
      cutoff: options.initialData?.cutoff ?? 2500,
      resonance: options.initialData?.resonance ?? 2.5,
      filterEnv: options.initialData?.filterEnv ?? 0,
      maxVoices: options.initialData?.maxVoices ?? 16,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.POLY_SYNTH,
      dataSchema: polySynthDataSchema,
      inputs: options.inputs ?? {
        events: null,
        trigger: Boolean,
        note: null,
        waveform: String,
        attack: Number,
        decay: Number,
        sustain: Number,
        release: Number,
        cutoff: Number,
        resonance: Number,
        filterEnv: Number,
      },
      outputs: options.outputs ?? {
        audioOut: String,
        activeVoices: Number,
        lastEvent: null,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'events' && Array.isArray(value)) {
          ;(ctx.node as PolySynthNodeEngine).playEvents(value as AudioEvent[])
        } else if (name === 'trigger' && Boolean(value)) {
          const noteVal = (ctx.node as PolySynthNodeEngine).getInputs().note
          const resolvedNote =
            typeof noteVal === 'string' || typeof noteVal === 'number' ? noteVal : 'C4'
          ;(ctx.node as PolySynthNodeEngine).playNote(resolvedNote)
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
      onOutputDisconnect: (name, ctx) => {
        if (name === 'audioOut') {
          ;(ctx.node as PolySynthNodeEngine).disconnectAudioOutput()
        }
        if (options.onOutputDisconnect) {
          options.onOutputDisconnect(name, ctx)
        }
      },
      onDestroy: () => {
        this.disconnectAudioOutput()
        this.destroyVoices()
      },
    })

    this.initAudioNodes()
  }

  private noiseBuffer: any = null

  private getNoiseBuffer(ctx: any): any {
    if (!this.noiseBuffer) {
      const bufferSize = ctx.sampleRate || 44100
      const buffer = ctx.createBuffer(1, bufferSize, bufferSize)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      this.noiseBuffer = buffer
    }
    return this.noiseBuffer
  }

  private initAudioNodes(): void {
    const ctx = this.driver.getContext()
    this.outputGain = ctx.createGain()

    const voiceCount = this.data.maxVoices ?? 16
    this.voices = []

    for (let i = 0; i < voiceCount; i++) {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      const noise = ctx.createBufferSource()
      noise.buffer = this.getNoiseBuffer(ctx)
      noise.loop = true
      const noiseGain = ctx.createGain()

      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null

      gain.gain.setValueAtTime(0, ctx.currentTime)
      oscGain.gain.setValueAtTime(1, ctx.currentTime)
      noiseGain.gain.setValueAtTime(0, ctx.currentTime)

      osc.connect(oscGain)
      oscGain.connect(filter)

      noise.connect(noiseGain)
      noiseGain.connect(filter)

      filter.connect(gain)
      if (panner) {
        gain.connect(panner)
        panner.connect(this.outputGain)
      } else {
        gain.connect(this.outputGain)
      }

      if (typeof osc.start === 'function') {
        try {
          osc.start()
        } catch {
          // ignore already started
        }
      }
      if (typeof noise.start === 'function') {
        try {
          noise.start()
        } catch {
          // ignore already started
        }
      }

      this.voices.push({
        id: i,
        osc,
        oscGain,
        noise,
        noiseGain,
        filter,
        gain,
        panner,
        busyUntil: 0,
      })
    }

    const busId = `audio-bus-${this.id || 'synth'}`
    this.driver.registerBus(busId, this.outputGain)
    this.emitOutput('audioOut', busId)
  }

  public disconnectAudioOutput(): void {
    try {
      this.outputGain?.disconnect?.()
    } catch {
      // ignore
    }
    for (const v of this.voices) {
      if (v.gain?.gain) {
        v.gain.gain.value = 0
      }
      v.busyUntil = 0
    }
    this.emitActiveVoices()
  }

  private destroyVoices(): void {
    const busId = this.getOutputs().audioOut || `audio-bus-${this.id || 'synth'}`
    if (busId) {
      this.driver.unregisterBus(busId)
    }
    try {
      this.outputGain?.disconnect?.()
    } catch {
      // ignore
    }
    for (const v of this.voices) {
      if (typeof v.osc?.stop === 'function') {
        try {
          v.osc.stop()
        } catch {
          // ignore
        }
      }
      if (typeof v.noise?.stop === 'function') {
        try {
          v.noise.stop()
        } catch {
          // ignore
        }
      }
      try {
        v.osc?.disconnect?.()
        v.oscGain?.disconnect?.()
        v.noise?.disconnect?.()
        v.noiseGain?.disconnect?.()
        v.filter?.disconnect?.()
        v.gain?.disconnect?.()
        v.panner?.disconnect?.()
      } catch {
        // ignore
      }
    }
    this.voices = []
  }

  private allocateVoice(time: number): SynthVoice {
    let oldestVoice = this.voices[0]
    let earliestBusy = Infinity

    for (const v of this.voices) {
      if (v.busyUntil <= time) {
        return v
      }
      if (v.busyUntil < earliestBusy) {
        earliestBusy = v.busyUntil
        oldestVoice = v
      }
    }
    return oldestVoice
  }

  public playEvents(events: AudioEvent[]): void {
    for (const ev of events) {
      const freq = ev.freq ?? noteToFrequency(ev.note ?? 'C4')
      this.scheduleVoice(
        freq,
        ev.time,
        ev.duration,
        ev.velocity ?? 0.8,
        ev.pan ?? 0.0,
      )
      this.emitOutput('lastEvent', ev)
    }
    this.emitActiveVoices()
  }

  public playNote(noteOrFreq: string | number, durationSec: number = 0.25): void {
    const ctx = this.driver.getContext()
    const now = ctx.currentTime
    const freq = noteToFrequency(noteOrFreq)
    this.scheduleVoice(freq, now, durationSec, 0.8, 0.0)
    this.emitActiveVoices()
  }

  public scheduleVoice(
    freq: number,
    startTime: number,
    duration: number,
    velocity: number = 0.8,
    pan: number = 0.0,
  ): void {
    const ctx = this.driver.getContext()
    const ctxNow = ctx?.currentTime ?? 0
    // Ensure startTime is a finite, non-negative number and at least the current audio time
    const safeStartTime = Math.max(0, ctxNow, Number.isFinite(startTime) ? startTime : ctxNow)

    const inputs = this.getInputs()
    const waveform = (inputs.waveform || this.data.waveform || 'sawtooth') as OscillatorType
    const attack = Number(inputs.attack || this.data.attack || 0.01)
    const decay = Number(inputs.decay || this.data.decay || 0.15)
    const sustain = Number(inputs.sustain ?? this.data.sustain ?? 0.6)
    const release = Number(inputs.release || this.data.release || 0.3)
    const cutoff = Number(inputs.cutoff || this.data.cutoff || 2500)
    const resonance = Number(inputs.resonance || this.data.resonance || 2.5)
    const filterEnv = Number(inputs.filterEnv ?? this.data.filterEnv ?? 0)

    const voice = this.allocateVoice(safeStartTime)
    const endTime = safeStartTime + duration + release
    voice.busyUntil = endTime

    // Configure Oscillator & Noise Routing
    if (voice.osc?.frequency && typeof voice.osc.frequency.setValueAtTime === 'function') {
      voice.osc.frequency.setValueAtTime(freq, safeStartTime)
    }
    if ((waveform as string) === 'noise') {
      if (voice.oscGain?.gain?.setValueAtTime) {
        voice.oscGain.gain.setValueAtTime(0, safeStartTime)
      }
      if (voice.noiseGain?.gain?.setValueAtTime) {
        voice.noiseGain.gain.setValueAtTime(1, safeStartTime)
      }
    } else {
      if (voice.osc) {
        voice.osc.type = waveform
      }
      if (voice.oscGain?.gain?.setValueAtTime) {
        voice.oscGain.gain.setValueAtTime(1, safeStartTime)
      }
      if (voice.noiseGain?.gain?.setValueAtTime) {
        voice.noiseGain.gain.setValueAtTime(0, safeStartTime)
      }
    }

    // Configure Filter Frequency, Envelope & Resonance
    if (voice.filter?.frequency) {
      if (typeof voice.filter.frequency.cancelScheduledValues === 'function') {
        voice.filter.frequency.cancelScheduledValues(safeStartTime)
      }
      if (typeof voice.filter.frequency.setValueAtTime === 'function') {
        voice.filter.frequency.setValueAtTime(cutoff, safeStartTime)
        if (filterEnv !== 0 && typeof voice.filter.frequency.linearRampToValueAtTime === 'function') {
          const peakCutoff = Math.max(20, Math.min(20000, cutoff + filterEnv))
          const sustainCutoff = Math.max(20, Math.min(20000, cutoff + filterEnv * sustain))
          voice.filter.frequency.linearRampToValueAtTime(peakCutoff, safeStartTime + attack)
          voice.filter.frequency.linearRampToValueAtTime(sustainCutoff, safeStartTime + attack + decay)
          voice.filter.frequency.setValueAtTime(sustainCutoff, safeStartTime + duration)
          voice.filter.frequency.linearRampToValueAtTime(cutoff, endTime)
        }
      }
    }
    if (voice.filter?.Q) {
      voice.filter.Q.value = resonance
    }

    // Configure Panner
    if (voice.panner && voice.panner.pan) {
      voice.panner.pan.value = pan
    }

    // ADSR Envelope
    const gainParam = voice.gain.gain
    if (typeof gainParam.cancelScheduledValues === 'function') {
      gainParam.cancelScheduledValues(safeStartTime)
    }
    if (typeof gainParam.setValueAtTime === 'function') {
      gainParam.setValueAtTime(0, safeStartTime)
      gainParam.linearRampToValueAtTime(velocity, safeStartTime + attack)
      gainParam.linearRampToValueAtTime(velocity * sustain, safeStartTime + attack + decay)
      gainParam.setValueAtTime(velocity * sustain, safeStartTime + duration)
      gainParam.linearRampToValueAtTime(0, endTime)
    }
  }

  private emitActiveVoices(): void {
    const ctx = this.driver.getContext()
    const now = ctx.currentTime
    const active = this.voices.filter((v) => v.busyUntil > now).length
    this.emitOutput('activeVoices', active)
  }

  public getOutputNode(): any {
    return this.outputGain
  }
}

export function createPolySynthNode(
  options: Partial<
    NodeInitOptions<PolySynthInputs, PolySynthOutputs, PolySynthData>
  > = {},
) {
  return new PolySynthNodeEngine(options)
}
