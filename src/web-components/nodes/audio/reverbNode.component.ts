import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createReverbNode,
  type ReverbNodeEngine,
} from '../../../nodes/audio/fx/reverb.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-reverb-node>
 * Algorithmic Convolution / Diffusion Reverb visual node.
 */
export class AxonReverbNode extends AxonBaseNodeElement<ReverbNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): ReverbNodeEngine {
    return createReverbNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.REVERB
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.REVERB)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const data = this.engine.data
    const roomSize = Number(this.engine.getInput('roomSize') ?? data.roomSize ?? 2.5)
    const mix = Number(this.engine.getInput('mix') ?? data.mix ?? 0.3)

    if (!this.querySelector('.axon-card-content')) {
      this.innerHTML = `
        <div class="axon-card-content audio-node-panel" style="min-width: 200px;">
          <div class="node-header" data-drag-handle>
            <span class="node-title">🌌 Reverb FX</span>
            <span class="node-badge" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6;">FX</span>
          </div>

          <div class="audio-control-stack" style="padding: 6px 10px; display: flex; flex-direction: column; gap: 6px;">
            <div class="audio-control-row">
              <span class="audio-control-label">Room: <span class="reverb-room-val">${roomSize.toFixed(1)}</span></span>
              <input type="range" class="reverb-slider-room" min="0.2" max="10.0" step="0.2" value="${roomSize}" style="flex: 1; accent-color: #8b5cf6;" />
            </div>

            <div class="audio-control-row">
              <span class="audio-control-label">Mix: <span class="reverb-mix-val">${Math.round(mix * 100)}%</span></span>
              <input type="range" class="reverb-slider-mix" min="0" max="1" step="0.02" value="${mix}" style="flex: 1; accent-color: #ec4899;" />
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
          </div>
        </div>
      `

      const roomSlider = this.querySelector<HTMLInputElement>('.reverb-slider-room')
      roomSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('roomSize', val)
        if (this.engine) this.engine.data.roomSize = val
        const label = this.querySelector('.reverb-room-val')
        if (label) label.textContent = `${val.toFixed(1)}`
      })

      const mixSlider = this.querySelector<HTMLInputElement>('.reverb-slider-mix')
      mixSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('mix', val)
        if (this.engine) this.engine.data.mix = val
        const label = this.querySelector('.reverb-mix-val')
        if (label) label.textContent = `${Math.round(val * 100)}%`
      })
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_REVERB_NODE)) {
  customElements.define(TAG_NAMES.AXON_REVERB_NODE, AxonReverbNode)
}
