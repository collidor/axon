import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createMasterOutputNode,
  type MasterOutputNodeEngine,
} from '../../../nodes/audio/fx/masterOutput.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'
import { AudioDriverManager } from '../../../nodes/audio/driver/audioDriver'

/**
 * <axon-master-output-node>
 * Master Audio Output visual node.
 * Features:
 * - Real-time canvas oscilloscope & VU volume meter
 * - Master volume fader and mute toggle
 * - AudioContext autoplay unlock trigger
 */
export class AxonMasterOutputNode extends AxonBaseNodeElement<MasterOutputNodeEngine> {
  private animFrameId?: number
  private canvasEl: HTMLCanvasElement | null = null
  private ctx2d: CanvasRenderingContext2D | null = null
  private dataArray: Uint8Array = new Uint8Array(64)

  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): MasterOutputNodeEngine {
    return createMasterOutputNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.MASTER_OUTPUT
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.MASTER_OUTPUT)
    super.connectedCallback()
    this.startOscilloscope()
  }

  disconnectedCallback() {
    this.stopOscilloscope()
    super.disconnectedCallback()
  }

  private startOscilloscope() {
    if (typeof requestAnimationFrame !== 'function') return

    const draw = () => {
      this.renderWaveform()
      this.animFrameId = requestAnimationFrame(draw)
    }
    this.animFrameId = requestAnimationFrame(draw)
  }

  private stopOscilloscope() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = undefined
    }
  }

  private renderWaveform() {
    if (!this.canvasEl) {
      this.canvasEl = this.querySelector<HTMLCanvasElement>('.master-oscilloscope-canvas')
      if (this.canvasEl) {
        this.ctx2d = this.canvasEl.getContext('2d')
      }
    }
    if (!this.ctx2d || !this.canvasEl) return

    const ctx = this.ctx2d
    const w = this.canvasEl.width || 220
    const h = this.canvasEl.height || 64

    ctx.fillStyle = '#090d16'
    ctx.fillRect(0, 0, w, h)

    const analyser = this.engine?.getAnalyserNode()
    if (analyser && typeof analyser.getByteTimeDomainData === 'function') {
      analyser.getByteTimeDomainData(this.dataArray)
    } else {
      // Idle center line
      this.dataArray.fill(128)
    }

    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#10b981'
    ctx.beginPath()

    const sliceWidth = w / this.dataArray.length
    let x = 0
    let peak = 0

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0
      const y = (v * h) / 2
      const diff = Math.abs(this.dataArray[i] - 128) / 128
      if (diff > peak) peak = diff

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
      x += sliceWidth
    }

    ctx.stroke()

    // Update VU meter bar
    const vuFill = this.querySelector<HTMLElement>('.master-vu-fill')
    if (vuFill) {
      const pct = Math.min(100, Math.round(peak * 150))
      vuFill.style.width = `${pct}%`
    }
  }

  render() {
    if (!this.engine) return

    const vol = Number(this.engine.getInput('volume') ?? this.engine.data.volume ?? 0.8)
    const muted = Boolean(this.engine.getInput('mute') ?? this.engine.data.muted ?? false)
    const driverState = AudioDriverManager.get().getContext().state

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>🔊 Master Audio Output</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate">
            <div class="audio-control-row">
              <span class="audio-control-label">Oscilloscope</span>
              <button
                type="button"
                class="audio-unlock-badge ${driverState === 'running' ? 'is-active' : 'is-suspended'}"
                title="Browser Audio Engine Status"
              >
                ${driverState === 'running' ? '● Audio Active' : '▶ Enable Audio'}
              </button>
            </div>

            <!-- Oscilloscope Canvas -->
            <div class="master-oscilloscope-container">
              <canvas class="master-oscilloscope-canvas" width="220" height="64"></canvas>
            </div>

            <!-- VU Meter -->
            <div class="master-meter-row">
              <span class="audio-control-label">VU</span>
              <div class="master-vu-bar">
                <div class="master-vu-fill"></div>
              </div>
            </div>

            <!-- Volume & Mute Controls -->
            <div class="audio-control-row" style="margin-top: 4px;">
              <span class="audio-control-label">Vol: <span class="master-vol-label">${Math.round(vol * 100)}%</span></span>
              <input
                type="range"
                class="master-vol-slider"
                min="0"
                max="1"
                step="0.02"
                value="${vol}"
                style="flex: 1; accent-color: #10b981;"
              />
              <button
                type="button"
                class="master-mute-btn transport-btn ${muted ? 'is-active' : ''}"
                style="padding: 2px 6px; font-size: 10px;"
                title="Mute Audio"
              >
                ${muted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          </div>

          <div class="data-node-body" style="padding: 4px 0 2px 0;">
            <div class="data-node-row port-row-pair">
              <!-- Audio Input -->
              <axon-port-in
                id="${this.engine.getPortId('audioIn')}"
                data-type="string"
                class="port input"
                style="--port-color: #10b981;"
              >
                <span class="port-label">Audio In</span>
              </axon-port-in>

              <!-- Current Volume Out -->
              <axon-port-out
                id="${this.engine.getPortId('currentVolume')}"
                data-type="number"
                class="port output"
                style="--port-color: #f59e0b;"
              >
                <span class="port-label">Level</span>
              </axon-port-out>
            </div>

            <div class="data-node-row port-row-pair">
              <!-- Volume CV -->
              <axon-port-in
                id="${this.engine.getPortId('volume')}"
                data-type="number"
                class="port input"
                style="--port-color: #06b6d4;"
              >
                <span class="port-label">Volume CV</span>
              </axon-port-in>
            </div>
          </div>
        </div>
      `

      // Volume slider listener
      const volSlider = this.querySelector<HTMLInputElement>('.master-vol-slider')
      volSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('volume', val)
        if (this.engine) this.engine.data.volume = val
        const label = this.querySelector('.master-vol-label')
        if (label) label.textContent = `${Math.round(val * 100)}%`
      })

      // Mute toggle listener
      const muteBtn = this.querySelector<HTMLButtonElement>('.master-mute-btn')
      muteBtn?.addEventListener('click', () => {
        const currentMuted = Boolean(this.engine?.getInput('mute') ?? this.engine?.data.muted)
        const nextMuted = !currentMuted
        this.setInput('mute', nextMuted)
        if (this.engine) this.engine.data.muted = nextMuted
        muteBtn.classList.toggle('is-active', nextMuted)
        muteBtn.textContent = nextMuted ? 'Unmute' : 'Mute'
      })

      // Audio unlock button
      const unlockBadge = this.querySelector<HTMLButtonElement>('.audio-unlock-badge')
      unlockBadge?.addEventListener('click', async () => {
        await AudioDriverManager.get().resume()
        this.render()
      })
    }

    // Refresh dynamic state
    const badge = this.querySelector<HTMLButtonElement>('.audio-unlock-badge')
    if (badge) {
      const isRunning = driverState === 'running'
      badge.classList.toggle('is-active', isRunning)
      badge.classList.toggle('is-suspended', !isRunning)
      badge.textContent = isRunning ? '● Audio Active' : '▶ Enable Audio'
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_MASTER_OUTPUT_NODE)) {
  customElements.define(TAG_NAMES.AXON_MASTER_OUTPUT_NODE, AxonMasterOutputNode)
}
