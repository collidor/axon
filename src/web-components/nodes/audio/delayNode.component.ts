import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createAudioDelayNode,
  type DelayNodeEngine,
} from '../../../nodes/audio/fx/delay.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-delay-node>
 * Stereo Feedback Delay Audio Effect visual node.
 * Features:
 * - Time, Feedback, and Mix controls
 * - Audio In and Audio Out sockets
 */
export class AxonDelayNode extends AxonBaseNodeElement<DelayNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): DelayNodeEngine {
    return createAudioDelayNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.DELAY
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.DELAY)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const data = this.engine.data
    const time = Number(this.engine.getInput('time') ?? data.time ?? 0.28)
    const feedback = Number(this.engine.getInput('feedback') ?? data.feedback ?? 0.25)
    const mix = Number(this.engine.getInput('mix') ?? data.mix ?? 0.2)

    if (!this.querySelector('.axon-card-content')) {
      this.innerHTML = `
        <div class="axon-card-content audio-node-panel" style="min-width: 200px;">
          <div class="node-header" data-drag-handle>
            <span class="node-title">🌊 Delay FX</span>
            <span class="node-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">FX</span>
          </div>

          <div class="audio-control-stack" style="padding: 6px 10px; display: flex; flex-direction: column; gap: 6px;">
            <div class="audio-control-row">
              <span class="audio-control-label">Time: <span class="delay-time-val">${Math.round(time * 1000)}ms</span></span>
              <input type="range" class="delay-slider-time" min="0.02" max="1.5" step="0.01" value="${time}" style="flex: 1; accent-color: #10b981;" />
            </div>

            <div class="audio-control-row">
              <span class="audio-control-label">Feedbk: <span class="delay-fb-val">${Math.round(feedback * 100)}%</span></span>
              <input type="range" class="delay-slider-fb" min="0" max="0.9" step="0.02" value="${feedback}" style="flex: 1; accent-color: #06b6d4;" />
            </div>

            <div class="audio-control-row">
              <span class="audio-control-label">Mix: <span class="delay-mix-val">${Math.round(mix * 100)}%</span></span>
              <input type="range" class="delay-slider-mix" min="0" max="1" step="0.02" value="${mix}" style="flex: 1; accent-color: #8b5cf6;" />
            </div>
          </div>

          <div class="data-node-body" style="padding: 4px 0 2px 0;">
            <div class="data-node-row port-row-pair">
              <axon-port-in
                id="${this.engine.getPortId('audioIn')}"
                data-type="string"
                class="port input"
                style="--port-color: #10b981;"
              >
                <span class="port-label">Audio In</span>
              </axon-port-in>

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
              <axon-port-in
                id="${this.engine.getPortId('time')}"
                data-type="number"
                class="port input"
                style="--port-color: #06b6d4;"
              >
                <span class="port-label">Time CV</span>
              </axon-port-in>
            </div>
          </div>
        </div>
      `

      const timeSlider = this.querySelector<HTMLInputElement>('.delay-slider-time')
      timeSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('time', val)
        if (this.engine) this.engine.data.time = val
        const label = this.querySelector('.delay-time-val')
        if (label) label.textContent = `${Math.round(val * 1000)}ms`
      })

      const fbSlider = this.querySelector<HTMLInputElement>('.delay-slider-fb')
      fbSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('feedback', val)
        if (this.engine) this.engine.data.feedback = val
        const label = this.querySelector('.delay-fb-val')
        if (label) label.textContent = `${Math.round(val * 100)}%`
      })

      const mixSlider = this.querySelector<HTMLInputElement>('.delay-slider-mix')
      mixSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('mix', val)
        if (this.engine) this.engine.data.mix = val
        const label = this.querySelector('.delay-mix-val')
        if (label) label.textContent = `${Math.round(val * 100)}%`
      })
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_DELAY_NODE)) {
  customElements.define(TAG_NAMES.AXON_DELAY_NODE, AxonDelayNode)
}
