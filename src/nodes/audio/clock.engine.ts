import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { AUDIO_NODE_TYPES } from './audioNodes.constants'

import { AudioDriverManager } from './driver/audioDriver'

export interface AudioTimeProvider {
  getCurrentTime(): number
}

class DefaultAudioTimeProvider implements AudioTimeProvider {
  private startTime = performance.now() / 1000

  getCurrentTime(): number {
    try {
      const driver = AudioDriverManager.getInstance()
      const ctx = driver.getContext()
      if (ctx && typeof ctx.currentTime === 'number') {
        return ctx.currentTime
      }
    } catch {
      // Fallback if driver context creation fails
    }

    return performance.now() / 1000 - this.startTime
  }
}

export class MockAudioTimeProvider implements AudioTimeProvider {
  public currentTime = 0

  getCurrentTime(): number {
    return this.currentTime
  }

  advance(deltaSeconds: number): void {
    this.currentTime += deltaSeconds
  }
}

export const audioClockDataSchema = s.struct({
  bpm: s.number().min(20).max(300).default(120),
  beatsPerCycle: s.number().default(4),
  lookaheadMs: s.number().default(100),
  run: s.boolean().default(true),
})

export type AudioClockData = {
  bpm?: number
  beatsPerCycle?: number
  lookaheadMs?: number
  run?: boolean
  [key: string]: unknown
}

export type AudioClockInputs = {
  bpm: typeof Number
  run: typeof Boolean
  reset: typeof Boolean
  lookaheadMs: typeof Number
}

export type AudioClockOutputs = {
  cycle: typeof Number
  phase: typeof Number
  cps: typeof Number
  tick: typeof Boolean
  time: typeof Number
  arc: null
}

export interface CycleArc {
  start: number
  end: number
  cycle: number
  phase: number
  time: number
  duration: number
}

export class AudioClockNodeEngine extends BaseNode<
  AudioClockInputs,
  AudioClockOutputs,
  AudioClockData
> {
  private timeProvider: AudioTimeProvider
  private intervalTimer?: ReturnType<typeof setInterval>
  private startTime: number = 0
  private lastScheduledTime: number = 0
  private isRunning: boolean = false
  private currentCycle: number = 0
  private currentPhase: number = 0

  constructor(
    options: Partial<
      NodeInitOptions<AudioClockInputs, AudioClockOutputs, AudioClockData>
    > = {},
    timeProvider?: AudioTimeProvider,
  ) {
    const initialData: AudioClockData = {
      bpm: options.initialData?.bpm ?? 120,
      beatsPerCycle: options.initialData?.beatsPerCycle ?? 4,
      lookaheadMs: options.initialData?.lookaheadMs ?? 100,
      run: options.initialData?.run ?? true,
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: AUDIO_NODE_TYPES.AUDIO_CLOCK,
      dataSchema: audioClockDataSchema,
      inputs: options.inputs ?? {
        bpm: Number,
        run: Boolean,
        reset: Boolean,
        lookaheadMs: Number,
      },
      outputs: options.outputs ?? {
        cycle: Number,
        phase: Number,
        cps: Number,
        tick: Boolean,
        time: Number,
        arc: null,
      },
      initialData,
      onInit: (ctx) => {
        if (options.onInit) options.onInit(ctx)
      },
      onDestroy: (ctx) => {
        this.stop()
        if (options.onDestroy) options.onDestroy(ctx)
      },
      onInputChange: (name, value, ctx) => {
        if (name === 'bpm' && typeof value === 'number') {
          this.setBpm(value)
        } else if (name === 'run') {
          if (Boolean(value)) this.start()
          else this.stop()
        } else if (name === 'reset' && Boolean(value)) {
          this.reset()
        }
        if (options.onInputChange) {
          options.onInputChange(name, value, ctx)
        }
      },
    })

    this.timeProvider = timeProvider ?? new DefaultAudioTimeProvider()
    if (this.data.run !== false) {
      this.start()
    }
  }

  public setTimeProvider(provider: AudioTimeProvider): void {
    this.timeProvider = provider
    this.reset()
  }

  public getBpm(): number {
    const inputBpm = this.getInputs().bpm
    return typeof inputBpm === 'number' && inputBpm > 0
      ? inputBpm
      : (this.data.bpm ?? 120)
  }

  public setBpm(newBpm: number): void {
    const clamped = Math.max(20, Math.min(300, newBpm))
    this.data.bpm = clamped
    this.setInput('bpm', clamped)
    this.emitCps()
  }

  public getCps(): number {
    const bpm = this.getBpm()
    const beatsPerCycle = this.data.beatsPerCycle ?? 4
    return bpm / (60 * beatsPerCycle)
  }

  private emitCps(): void {
    this.emitOutput('cps', this.getCps())
  }

  public start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.startTime = this.timeProvider.getCurrentTime()
    this.lastScheduledTime = this.startTime

    this.emitCps()
    this.pollAhead()

    // Interval query every 25ms
    if (typeof setInterval !== 'undefined') {
      this.intervalTimer = setInterval(() => {
        if (this.isRunning) {
          this.pollAhead()
        }
      }, 25)
    }
  }

  public stop(): void {
    this.isRunning = false
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = undefined
    }
  }

  public reset(): void {
    this.startTime = this.timeProvider.getCurrentTime()
    this.lastScheduledTime = this.startTime
    this.currentCycle = 0
    this.currentPhase = 0
    this.pollAhead()
  }

  /**
   * Advances the clock manually by deltaSeconds (useful for deterministic tests & offline processing).
   */
  public advance(deltaSeconds: number): CycleArc {
    if (this.timeProvider instanceof MockAudioTimeProvider) {
      this.timeProvider.advance(deltaSeconds)
    }
    return this.pollAhead()
  }

  /**
   * Executes one ahead-of-time scheduling query window.
   */
  public pollAhead(): CycleArc {
    const now = this.timeProvider.getCurrentTime()
    const lookaheadSec = (this.data.lookaheadMs ?? 100) / 1000
    const ahead = now + lookaheadSec

    const cps = this.getCps()
    const elapsedNow = Math.max(0, now - this.startTime)
    const elapsedAhead = Math.max(0, ahead - this.startTime)

    const startCycleTime = elapsedNow * cps
    const endCycleTime = elapsedAhead * cps

    this.currentCycle = Math.floor(startCycleTime)
    this.currentPhase = startCycleTime % 1

    const arc: CycleArc = {
      start: startCycleTime,
      end: endCycleTime,
      cycle: this.currentCycle,
      phase: this.currentPhase,
      time: now,
      duration: Math.max(0, ahead - now),
    }

    this.emitOutput('cycle', this.currentCycle)
    this.emitOutput('phase', this.currentPhase)
    this.emitOutput('cps', cps)
    this.emitOutput('time', now)
    this.emitOutput('tick', true)
    this.emitOutput('arc', arc)

    this.lastScheduledTime = ahead
    return arc
  }
}

export function createAudioClockNode(
  options: Partial<
    NodeInitOptions<AudioClockInputs, AudioClockOutputs, AudioClockData>
  > = {},
  timeProvider?: AudioTimeProvider,
) {
  return new AudioClockNodeEngine(options, timeProvider)
}
