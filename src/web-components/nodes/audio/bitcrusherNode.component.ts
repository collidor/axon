import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createBitcrusherNode,
  type BitcrusherNodeEngine,
} from '../../../nodes/audio/fx/bitcrusher.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-bitcrusher-node>
 * Lo-fi Bit Reduction and Sample Rate Reduction visual node.
 */
export class AxonBitcrusherNode extends AxonBaseNodeElement<BitcrusherNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): BitcrusherNodeEngine {
    return createBitcrusherNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.BITCRUSHER
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.BITCRUSHER)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const data = this.engine.data
    const bits = Number(this.engine.getInput('bits') ?? data.bits ?? 8)
    const drive = Number(this.engine.getInput('drive') ?? data.drive ?? 1)
    const mix = Number(this.engine.getInput('mix') ?? data.mix ?? 0.5)

    if (!this.querySelector('.axon-card-content')) {
      this.innerHTML = `
        <div class="axon-card-content audio-node-panel" style="min-width: 200px;">
          <div class="node-header" data-drag-handle>
            <span class="node-title">👾 Bitcrusher FX</span>
            <span class="node-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">FX</span>
          </div>

          <div class="audio-control-stack" style="padding: 6px 10px; display: flex; flex-direction: column; gap: 6px;">
            <div class="audio-control-row">
              <span class="audio-control-label">Bits: <span class="bc-bits-val">${bits} bit</span></span>
              <input type="range" class="bc-slider-bits" min="2" max="16" step="1" value="${bits}" style="flex: 1; accent-color: #ef4444;" />
            </div>

            <div class="audio-control-row">
              <span class="audio-control-label">Drive: <span class="bc-drive-val">${drive.toFixed(1)}x</span></span>
              <input type="range" class="bc-slider-drive" min="1" max="10" step="0.5" value="${drive}" style="flex: 1; accent-color: #f59e0b;" />
            </div>

            <div class="audio-control-row">
              <span class="audio-control-label">Mix: <span class="bc-mix-val">${Math.round(mix * 100)}%</span></span>
              <input type="range" class="bc-slider-mix" min="0" max="1" step="0.02" value="${mix}" style="flex: 1; accent-color: #ec4899;" />
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

      const bitsSlider = this.querySelector<HTMLInputElement>('.bc-slider-bits')
      bitsSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('bits', val)
        if (this.engine) this.engine.data.bits = val
        const label = this.querySelector('.bc-bits-val')
        if (label) label.textContent = `${val} bit`
      })

      const driveSlider = this.querySelector<HTMLInputElement>('.bc-slider-drive')
      driveSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('drive', val)
        if (this.engine) this.engine.data.drive = val
        const label = this.querySelector('.bc-drive-val')
        if (label) label.textContent = `${val.toFixed(1)}x`
      })

      const mixSlider = this.querySelector<HTMLInputElement>('.bc-slider-mix')
      mixSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('mix', val)
        if (this.engine) this.engine.data.mix = val
        const label = this.querySelector('.bc-mix-val')
        if (label) label.textContent = `${Math.round(val * 100)}%`
      })
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_BITCRUSHER_NODE)) {
  customElements.define(TAG_NAMES.AXON_BITCRUSHER_NODE, AxonBitcrusherNode)
}
