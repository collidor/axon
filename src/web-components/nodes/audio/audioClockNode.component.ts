import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createAudioClockNode,
  type AudioClockNodeEngine,
} from '../../../nodes/audio/clock.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-audio-clock-node>
 * Audio Clock Transport visual node.
 * Features:
 * - BPM number input and Tap Tempo button
 * - Real-time Cycle and CPS display
 * - Play / Pause toggle
 */
export class AxonAudioClockNode extends AxonBaseNodeElement<AudioClockNodeEngine> {
  private lastTapTime = 0
  private tapIntervals: number[] = []

  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): AudioClockNodeEngine {
    return createAudioClockNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.AUDIO_CLOCK
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.AUDIO_CLOCK)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const bpm = Number(this.engine.getInput('bpm') ?? this.engine.data.bpm ?? 120)
    const isRunning = Boolean(this.engine.getInput('run') ?? this.engine.data.run ?? true)
    const cycle = Number(this.engine.getOutput('cycle') ?? 0)
    const cps = Number(this.engine.getOutput('cps') ?? (bpm / 60 / 4))

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>⏱ Audio Clock</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate">
            <div class="audio-control-row">
              <span class="audio-control-label">Tempo (BPM)</span>
              <button type="button" class="tap-tempo-btn transport-btn" style="padding: 2px 6px; font-size: 10px;">
                Tap
              </button>
            </div>

            <div class="audio-control-row">
              <input
                type="number"
                class="audio-clock-bpm-input"
                min="20"
                max="300"
                value="${bpm}"
                style="width: 64px; background: rgba(0,0,0,0.5); border: 1px solid #334155; border-radius: 4px; color: #38bdf8; font-family: var(--ui-font-mono, monospace); font-size: 13px; font-weight: 700; padding: 2px 6px;"
              />
              <button
                type="button"
                class="clock-run-btn transport-btn ${isRunning ? 'is-active' : ''}"
                style="padding: 2px 8px; font-size: 11px;"
              >
                ${isRunning ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>

            <div class="mini-notation-playhead" style="margin-top: 4px;">
              <span class="audio-control-label clock-cycle-display">Cycle: ${cycle.toFixed(2)}</span>
              <span class="playhead-pulse">●</span>
              <span class="audio-control-val clock-cps-display">${cps.toFixed(2)} CPS</span>
            </div>
          </div>

          <div class="port-grid">
            <!-- BPM Input -->
            <axon-port-in
              id="${this.engine.getPortId('bpm')}"
              data-type="number"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">BPM</span>
            </axon-port-in>

            <!-- Run Control -->
            <axon-port-in
              id="${this.engine.getPortId('run')}"
              data-type="boolean"
              class="port input"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Run</span>
            </axon-port-in>

            <!-- Arc Output -->
            <axon-port-out
              id="${this.engine.getPortId('arc')}"
              data-type="object"
              class="port output"
              style="--port-color: #8b5cf6;"
            >
              <span class="port-label">Arc</span>
            </axon-port-out>

            <!-- Cycle Output -->
            <axon-port-out
              id="${this.engine.getPortId('cycle')}"
              data-type="number"
              class="port output"
              style="--port-color: #f59e0b;"
            >
              <span class="port-label">Cycle</span>
            </axon-port-out>

            <!-- Tick Output -->
            <axon-port-out
              id="${this.engine.getPortId('tick')}"
              data-type="number"
              class="port output"
              style="--port-color: #ec4899;"
            >
              <span class="port-label">Tick</span>
            </axon-port-out>
          </div>
        </div>
      `

      // BPM input listener
      const bpmInput = this.querySelector<HTMLInputElement>('.audio-clock-bpm-input')
      bpmInput?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        if (val >= 20 && val <= 300) {
          this.setInput('bpm', val)
          if (this.engine) this.engine.data.bpm = val
        }
      })

      // Run toggle
      const runBtn = this.querySelector<HTMLButtonElement>('.clock-run-btn')
      runBtn?.addEventListener('click', () => {
        const current = Boolean(this.engine?.getInput('run') ?? this.engine?.data.run ?? true)
        const next = !current
        this.setInput('run', next)
        if (this.engine) this.engine.data.run = next
        runBtn.classList.toggle('is-active', next)
        runBtn.textContent = next ? '⏸ Pause' : '▶ Play'
      })

      // Tap tempo
      const tapBtn = this.querySelector<HTMLButtonElement>('.tap-tempo-btn')
      tapBtn?.addEventListener('click', () => {
        const now = performance.now()
        if (this.lastTapTime > 0) {
          const delta = now - this.lastTapTime
          if (delta > 200 && delta < 3000) {
            this.tapIntervals.push(delta)
            if (this.tapIntervals.length > 4) this.tapIntervals.shift()
            const avg = this.tapIntervals.reduce((a, b) => a + b, 0) / this.tapIntervals.length
            const newBpm = Math.round(60000 / avg)
            if (newBpm >= 20 && newBpm <= 300) {
              this.setInput('bpm', newBpm)
              if (this.engine) this.engine.data.bpm = newBpm
              if (bpmInput) bpmInput.value = String(newBpm)
            }
          } else {
            this.tapIntervals = []
          }
        }
        this.lastTapTime = now
      })
    }

    // Refresh dynamic cycle counter
    const cycleLabel = this.querySelector('.clock-cycle-display')
    if (cycleLabel) {
      cycleLabel.textContent = `Cycle: ${cycle.toFixed(2)}`
    }
    const cpsLabel = this.querySelector('.clock-cps-display')
    if (cpsLabel) {
      cpsLabel.textContent = `${cps.toFixed(2)} CPS`
    }
    const pulseEl = this.querySelector('.playhead-pulse')
    if (pulseEl) {
      pulseEl.classList.add('is-pulsing')
      setTimeout(() => pulseEl.classList.remove('is-pulsing'), 60)
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_AUDIO_CLOCK_NODE)) {
  customElements.define(TAG_NAMES.AXON_AUDIO_CLOCK_NODE, AxonAudioClockNode)
}
