// oxlint-disable typescript/no-explicit-any

export interface MockAudioParam {
  value: number
  setValueAtTime(val: number, time: number): void
  linearRampToValueAtTime(val: number, time: number): void
  exponentialRampToValueAtTime(val: number, time: number): void
  cancelScheduledValues(time: number): void
}

export function createMockAudioParam(initial: number = 0): MockAudioParam {
  return {
    value: initial,
    setValueAtTime(val: number) {
      this.value = val
    },
    linearRampToValueAtTime(val: number) {
      this.value = val
    },
    exponentialRampToValueAtTime(val: number) {
      this.value = val
    },
    cancelScheduledValues() {},
  }
}

export interface MockAudioNode {
  connect(dest: any): any
  disconnect(): void
}

export class NullAudioContext {
  public sampleRate: number = 44100
  public state: 'running' | 'suspended' | 'closed' = 'running'
  public destination: MockAudioNode = {
    connect: () => ({}),
    disconnect: () => {},
  }

  get currentTime(): number {
    return performance.now() / 1000
  }

  createGain(): any {
    return {
      gain: createMockAudioParam(1),
      connect: () => ({}),
      disconnect: () => {},
    }
  }

  createOscillator(): any {
    return {
      type: 'sine',
      frequency: createMockAudioParam(440),
      detune: createMockAudioParam(0),
      connect: () => ({}),
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    }
  }

  createBiquadFilter(): any {
    return {
      type: 'lowpass',
      frequency: createMockAudioParam(1000),
      Q: createMockAudioParam(1),
      gain: createMockAudioParam(0),
      connect: () => ({}),
      disconnect: () => {},
    }
  }

  createStereoPanner(): any {
    return {
      pan: createMockAudioParam(0),
      connect: () => ({}),
      disconnect: () => {},
    }
  }

  createAnalyser(): any {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getByteTimeDomainData: (arr: Uint8Array) => arr.fill(128),
      getByteFrequencyData: (arr: Uint8Array) => arr.fill(0),
      connect: () => ({}),
      disconnect: () => {},
    }
  }

  createBuffer(channels: number, length: number, sampleRate: number): any {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    }
  }

  createBufferSource(): any {
    return {
      buffer: null,
      playbackRate: createMockAudioParam(1),
      loop: false,
      connect: () => ({}),
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    }
  }

  createDelay(): any {
    return {
      delayTime: createMockAudioParam(0),
      connect: () => ({}),
      disconnect: () => {},
    }
  }

  createConvolver(): any {
    return {
      buffer: null,
      normalize: true,
      connect: () => ({}),
      disconnect: () => {},
    }
  }

  createWaveShaper(): any {
    return {
      curve: null,
      oversample: 'none',
      connect: () => ({}),
      disconnect: () => {},
    }
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async suspend(): Promise<void> {
    this.state = 'suspended'
  }

  async close(): Promise<void> {
    this.state = 'closed'
  }
}

export class AudioDriverManager {
  private static instance?: AudioDriverManager
  private audioContext?: AudioContext | NullAudioContext
  private isNullDriver: boolean = false

  private audioBuses: Map<string, any> = new Map()

  public static get(): AudioDriverManager {
    if (!AudioDriverManager.instance) {
      AudioDriverManager.instance = new AudioDriverManager()
    }
    return AudioDriverManager.instance
  }

  public static getInstance(): AudioDriverManager {
    return AudioDriverManager.get()
  }

  public registerBus(busId: string, node: any): void {
    if (busId && node) {
      this.audioBuses.set(busId, node)
    }
  }

  public unregisterBus(busId: string): void {
    if (busId) {
      this.audioBuses.delete(busId)
    }
  }

  public getBus(busId: string): any {
    return this.audioBuses.get(busId)
  }

  public getContext(): AudioContext | NullAudioContext {
    if (!this.audioContext) {
      const g = globalThis as any
      const AudioCtx = g.AudioContext || g.webkitAudioContext
      if (typeof AudioCtx === 'function') {
        try {
          this.audioContext = new AudioCtx()
          this.isNullDriver = false
        } catch {
          this.audioContext = new NullAudioContext()
          this.isNullDriver = true
        }
      } else {
        this.audioContext = new NullAudioContext()
        this.isNullDriver = true
      }
    }
    return this.audioContext!
  }

  public isHeadless(): boolean {
    this.getContext()
    return this.isNullDriver
  }

  public async resume(): Promise<void> {
    const ctx = this.getContext()
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      await ctx.resume()
    }
  }
}
