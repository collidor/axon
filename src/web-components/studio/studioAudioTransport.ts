import type { AxonGraph } from '../axonGraph.component'
import { TAG_NAMES } from '../constants'
import { AudioDriverManager } from '../../nodes/audio/driver/audioDriver'

export interface AudioTransportHost {
  graph: AxonGraph | null
}

/**
 * Controller managing audio transport synchronization, BPM tempo management,
 * tap tempo calculation, and Web Audio context activation.
 */
export class StudioAudioTransportController {
  private readonly host: AudioTransportHost
  private audioBpm = 120
  private audioPlaying = false
  private lastTapTimestamp = 0
  private tapIntervals: number[] = []

  private playButtonElement: HTMLButtonElement | null = null
  private bpmInputElement: HTMLInputElement | null = null
  private cycleLabelElement: HTMLElement | null = null
  private unlockBadgeElement: HTMLButtonElement | null = null

  constructor(host: AudioTransportHost) {
    this.host = host
  }

  public bindElements(elements: {
    playButton: HTMLButtonElement | null
    bpmInput: HTMLInputElement | null
    cycleLabel: HTMLElement | null
    unlockBadge: HTMLButtonElement | null
  }): void {
    this.playButtonElement = elements.playButton
    this.bpmInputElement = elements.bpmInput
    this.cycleLabelElement = elements.cycleLabel
    this.unlockBadgeElement = elements.unlockBadge
  }

  public get isPlaying(): boolean {
    return this.audioPlaying
  }

  public get currentBpm(): number {
    return this.audioBpm
  }

  /**
   * Toggles audio transport playback and propagates run state to all audio clock nodes in graph.
   */
  public togglePlay(explicitPlayState?: boolean): void {
    this.audioPlaying = explicitPlayState !== undefined ? explicitPlayState : !this.audioPlaying
    if (this.audioPlaying) {
      void AudioDriverManager.get().resume()
    }

    if (this.host.graph) {
      const clockNodes = this.host.graph.querySelectorAll<any>(TAG_NAMES.AXON_AUDIO_CLOCK_NODE)
      clockNodes.forEach((node) => {
        node.setInput?.('run', this.audioPlaying)
        if (node.engine) node.engine.data.run = this.audioPlaying
      })
    }

    if (this.playButtonElement) {
      this.playButtonElement.textContent = this.audioPlaying ? '⏸ Audio' : '▶ Audio'
      this.playButtonElement.classList.toggle('is-active', this.audioPlaying)
    }

    this.updateUnlockBadge()
  }

  /**
   * Stops audio playback, resets clock nodes, and updates UI status.
   */
  public stop(): void {
    this.audioPlaying = false
    if (this.host.graph) {
      const clockNodes = this.host.graph.querySelectorAll<any>(TAG_NAMES.AXON_AUDIO_CLOCK_NODE)
      clockNodes.forEach((node) => {
        node.setInput?.('run', false)
        node.setInput?.('reset', true)
        if (node.engine) node.engine.data.run = false
      })
    }

    if (this.playButtonElement) {
      this.playButtonElement.textContent = '▶ Audio'
      this.playButtonElement.classList.remove('is-active')
    }

    if (this.cycleLabelElement) {
      this.cycleLabelElement.textContent = '000.0.0'
    }

    this.updateUnlockBadge()
  }

  /**
   * Sets the BPM tempo (bounded between 20 and 300) and propagates to audio clock nodes.
   */
  public setBpm(newBpm: number): void {
    if (newBpm < 20 || newBpm > 300) return
    this.audioBpm = newBpm

    if (this.bpmInputElement) {
      this.bpmInputElement.value = String(newBpm)
    }

    if (this.host.graph) {
      const clockNodes = this.host.graph.querySelectorAll<any>(TAG_NAMES.AXON_AUDIO_CLOCK_NODE)
      clockNodes.forEach((node) => {
        node.setInput?.('bpm', newBpm)
        if (node.engine) node.engine.data.bpm = newBpm
      })
    }
  }

  /**
   * Calculates BPM dynamically from interactive user taps.
   */
  public tapTempo(): void {
    const currentTimestamp = performance.now()
    if (this.lastTapTimestamp > 0) {
      const intervalDelta = currentTimestamp - this.lastTapTimestamp
      if (intervalDelta > 200 && intervalDelta < 3000) {
        this.tapIntervals.push(intervalDelta)
        if (this.tapIntervals.length > 4) this.tapIntervals.shift()
        const averageInterval =
          this.tapIntervals.reduce((sum, val) => sum + val, 0) / this.tapIntervals.length
        const computedBpm = Math.round(60000 / averageInterval)
        this.setBpm(computedBpm)
      } else {
        this.tapIntervals = []
      }
    }
    this.lastTapTimestamp = currentTimestamp
  }

  /**
   * Updates Web Audio context running/suspended status badge.
   */
  public updateUnlockBadge(): void {
    if (!this.unlockBadgeElement) return
    const contextState = AudioDriverManager.get().getContext().state
    const isContextRunning = contextState === 'running'
    this.unlockBadgeElement.classList.toggle('is-active', isContextRunning)
    this.unlockBadgeElement.classList.toggle('is-suspended', !isContextRunning)
    this.unlockBadgeElement.textContent = isContextRunning ? '● Audio Active' : '▶ Enable Audio'
  }
}
