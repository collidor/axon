import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createPolySynthNode,
  type PolySynthNodeEngine,
} from '../../../nodes/audio/polySynth.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-synth-node>
 * 16-Voice Polyphonic Subtractive Synthesizer visual node.
 * Features:
 * - Interactive SVG ADSR envelope curve visualizer
 * - Cutoff frequency and resonance sliders
 * - Waveform selector
 * - Voice usage meter
 */
export class AxonSynthNode extends AxonBaseNodeElement<PolySynthNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): PolySynthNodeEngine {
    return createPolySynthNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.POLY_SYNTH
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.POLY_SYNTH)
    super.connectedCallback()
  }

  private calculateAdsrPath(a: number, d: number, s: number, r: number): string {
    const w = 220
    const h = 50
    const padX = 6
    const padY = 4
    const drawW = w - padX * 2
    const drawH = h - padY * 2

    const holdTime = 0.5
    const totalTime = Math.max(0.1, a + d + holdTime + r)

    const x0 = padX
    const y0 = padY + drawH

    const x1 = padX + (a / totalTime) * drawW
    const y1 = padY

    const x2 = padX + ((a + d) / totalTime) * drawW
    const y2 = padY + (1 - Math.max(0, Math.min(1, s))) * drawH

    const x3 = padX + ((a + d + holdTime) / totalTime) * drawW
    const y3 = y2

    const x4 = padX + drawW
    const y4 = y0

    return `M ${x0.toFixed(1)},${y0.toFixed(1)} L ${x1.toFixed(1)},${y1.toFixed(1)} L ${x2.toFixed(1)},${y2.toFixed(1)} L ${x3.toFixed(1)},${y3.toFixed(1)} L ${x4.toFixed(1)},${y4.toFixed(1)}`
  }

  render() {
    if (!this.engine) return

    const data = this.engine.data
    const a = Number(this.engine.getInput('attack') ?? data.attack ?? 0.01)
    const d = Number(this.engine.getInput('decay') ?? data.decay ?? 0.15)
    const s = Number(this.engine.getInput('sustain') ?? data.sustain ?? 0.6)
    const r = Number(this.engine.getInput('release') ?? data.release ?? 0.3)
    const cutoff = Number(this.engine.getInput('cutoff') ?? data.cutoff ?? 2500)
    const res = Number(this.engine.getInput('resonance') ?? data.resonance ?? 2.5)
    const waveform = String(this.engine.getInput('waveform') ?? data.waveform ?? 'sawtooth')
    const activeVoices = Number(this.engine.getOutput('activeVoices') ?? 0)

    const adsrPath = this.calculateAdsrPath(a, d, s, r)

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>🎹 PolySynth</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate">
            <div class="audio-control-row">
              <span class="audio-control-label">ADSR Envelope</span>
              <span class="audio-control-val synth-voice-meter">Voices: ${activeVoices}/16</span>
            </div>

            <!-- SVG Envelope Curve -->
            <div class="synth-adsr-box">
              <svg class="synth-adsr-svg" viewBox="0 0 220 50">
                <defs>
                  <linearGradient id="adsrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0" />
                  </linearGradient>
                </defs>
                <path class="adsr-area-path" d="${adsrPath} L 214,46 L 6,46 Z" fill="url(#adsrGrad)" />
                <path class="adsr-line-path" d="${adsrPath}" fill="none" stroke="#a78bfa" stroke-width="2" />
              </svg>
            </div>

            <!-- ADSR Knobs/Sliders -->
            <div class="synth-slider-grid">
              <div class="synth-param-col">
                <span class="audio-control-label">A</span>
                <input type="range" class="slider-attack" min="0.001" max="1.5" step="0.01" value="${a}" />
              </div>
              <div class="synth-param-col">
                <span class="audio-control-label">D</span>
                <input type="range" class="slider-decay" min="0.01" max="2.0" step="0.01" value="${d}" />
              </div>
              <div class="synth-param-col">
                <span class="audio-control-label">S</span>
                <input type="range" class="slider-sustain" min="0" max="1" step="0.05" value="${s}" />
              </div>
              <div class="synth-param-col">
                <span class="audio-control-label">R</span>
                <input type="range" class="slider-release" min="0.01" max="3.0" step="0.01" value="${r}" />
              </div>
            </div>

            <!-- Filter Controls -->
            <div class="audio-control-row" style="margin-top: 4px;">
              <span class="audio-control-label">Cutoff: <span class="cutoff-val" style="color: #38bdf8;">${Math.round(cutoff)}Hz</span></span>
              <span class="audio-control-label">Res: <span class="res-val" style="color: #38bdf8;">${res.toFixed(1)}</span></span>
            </div>
            <div class="audio-control-row">
              <input type="range" class="slider-cutoff" min="100" max="12000" step="50" value="${cutoff}" style="flex: 2; accent-color: #06b6d4;" />
              <input type="range" class="slider-resonance" min="0.1" max="20" step="0.5" value="${res}" style="flex: 1; accent-color: #f59e0b;" />
            </div>

            <!-- Waveform Select -->
            <div class="audio-control-row">
              <span class="audio-control-label">Waveform</span>
              <select class="synth-waveform-select" style="background: rgba(0,0,0,0.5); border: 1px solid #334155; color: #f1f5f9; font-size: 11px; border-radius: 4px; padding: 2px 4px;">
                <option value="sawtooth" ${waveform === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
                <option value="square" ${waveform === 'square' ? 'selected' : ''}>Square</option>
                <option value="sine" ${waveform === 'sine' ? 'selected' : ''}>Sine</option>
                <option value="triangle" ${waveform === 'triangle' ? 'selected' : ''}>Triangle</option>
              </select>
            </div>
          </div>

          <div class="data-node-body" style="padding: 4px 0 2px 0;">
            <div class="data-node-row port-row-pair">
              <!-- Events Input -->
              <axon-port-in
                id="${this.engine.getPortId('events')}"
                data-type="array"
                class="port input"
                style="--port-color: #f59e0b;"
              >
                <span class="port-label">Events</span>
              </axon-port-in>

              <!-- Audio Out -->
              <axon-port-out
                id="${this.engine.getPortId('audioOut')}"
                data-type="string"
                class="port output"
                style="--port-color: #10b981;"
              >
                <span class="port-label">Audio Out</span>
              </axon-port-out>
            </div>

            <div class="data-node-row port-row-pair">
              <!-- Cutoff CV Input -->
              <axon-port-in
                id="${this.engine.getPortId('cutoff')}"
                data-type="number"
                class="port input"
                style="--port-color: #06b6d4;"
              >
                <span class="port-label">Cutoff</span>
              </axon-port-in>

              <!-- Active Voices Out -->
              <axon-port-out
                id="${this.engine.getPortId('activeVoices')}"
                data-type="number"
                class="port output"
                style="--port-color: #8b5cf6;"
              >
                <span class="port-label">Voices</span>
              </axon-port-out>
            </div>
          </div>
        </div>
      `

      // Event listeners
      const bindSlider = (selector: string, prop: string) => {
        this.querySelector<HTMLInputElement>(selector)?.addEventListener('input', (e: Event) => {
          const val = Number((e.target as HTMLInputElement).value)
          this.setInput(prop, val)
          if (this.engine) this.engine.data[prop] = val
          this.updateAdsrVisual()
        })
      }

      bindSlider('.slider-attack', 'attack')
      bindSlider('.slider-decay', 'decay')
      bindSlider('.slider-sustain', 'sustain')
      bindSlider('.slider-release', 'release')

      this.querySelector<HTMLInputElement>('.slider-cutoff')?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('cutoff', val)
        if (this.engine) this.engine.data.cutoff = val
        const valEl = this.querySelector('.cutoff-val')
        if (valEl) valEl.textContent = `${Math.round(val)}Hz`
      })

      this.querySelector<HTMLInputElement>('.slider-resonance')?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('resonance', val)
        if (this.engine) this.engine.data.resonance = val
        const valEl = this.querySelector('.res-val')
        if (valEl) valEl.textContent = val.toFixed(1)
      })

      this.querySelector<HTMLSelectElement>('.synth-waveform-select')?.addEventListener('change', (e: Event) => {
        const val = (e.target as HTMLSelectElement).value
        this.setInput('waveform', val)
        if (this.engine) this.engine.data.waveform = val as any
      })
    }

    // Dynamic state updates
    const meterEl = this.querySelector('.synth-voice-meter')
    if (meterEl) {
      meterEl.textContent = `Voices: ${activeVoices}/16`
    }
    this.updateAdsrVisual()
  }

  private updateAdsrVisual() {
    if (!this.engine) return
    const data = this.engine.data
    const a = Number(this.engine.getInput('attack') ?? data.attack ?? 0.01)
    const d = Number(this.engine.getInput('decay') ?? data.decay ?? 0.15)
    const s = Number(this.engine.getInput('sustain') ?? data.sustain ?? 0.6)
    const r = Number(this.engine.getInput('release') ?? data.release ?? 0.3)

    const adsrPath = this.calculateAdsrPath(a, d, s, r)
    const linePath = this.querySelector('.adsr-line-path')
    if (linePath) linePath.setAttribute('d', adsrPath)
    const areaPath = this.querySelector('.adsr-area-path')
    if (areaPath) areaPath.setAttribute('d', `${adsrPath} L 214,46 L 6,46 Z`)
  }
}

if (!customElements.get(TAG_NAMES.AXON_SYNTH_NODE)) {
  customElements.define(TAG_NAMES.AXON_SYNTH_NODE, AxonSynthNode)
}

if (!customElements.get('axon-poly-synth-node')) {
  customElements.define('axon-poly-synth-node', class extends AxonSynthNode {})
}
