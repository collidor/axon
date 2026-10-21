import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createArpeggiatorNode,
  type ArpeggiatorNodeEngine,
} from '../../../nodes/audio/arpeggiator.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

const MODES = ['up', 'down', 'upDown', 'random']

/**
 * <axon-arpeggiator-node>
 * Arpeggiator visual node.
 * Cycles sequentially through chord notes across octaves upon incoming clock pulses.
 */
export class AxonArpeggiatorNode extends AxonBaseNodeElement<ArpeggiatorNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): ArpeggiatorNodeEngine {
    return createArpeggiatorNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.ARPEGGIATOR
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.ARPEGGIATOR)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const mode = String(this.engine.getInput('mode') ?? this.engine.data.mode ?? 'up')
    const octaves = Number(this.engine.getInput('octaves') ?? this.engine.data.octaves ?? 1)
    const currentNote = String(this.engine.getOutput('note') ?? '-')
    const currentFreq = Number(this.engine.getOutput('freq') ?? 0)

    if (!this.querySelector('.node-body')) {
      const modeOptions = MODES.map(
        (m) => `<option value="${m}" ${m === mode ? 'selected' : ''}>${m}</option>`,
      ).join('')

      this.innerHTML = `
        <div class="node-header">
          <h3>✨ Arpeggiator</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate" style="display: flex; flex-direction: column; gap: 6px; padding: 6px 8px;">
            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Mode & Octaves</span>
              <div style="display: flex; gap: 4px; align-items: center;">
                <select class="arp-mode-select" style="background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px;">
                  ${modeOptions}
                </select>
                <input
                  type="number"
                  class="arp-octaves-input"
                  min="1"
                  max="4"
                  value="${octaves}"
                  style="width: 38px; background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px; text-align: center;"
                />
              </div>
            </div>

            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Current Note</span>
              <span class="arp-note-readout" style="font-family: var(--ui-font-mono, monospace); font-weight: bold; color: #10b981;">
                ${currentNote} ${currentFreq > 0 ? `(${Math.round(currentFreq)} Hz)` : ''}
              </span>
            </div>
          </div>

          <div class="port-grid">
            <!-- Inputs -->
            <axon-port-in
              id="${this.engine.getPortId('clock')}"
              data-type="boolean"
              class="port input"
              style="--port-color: #3b82f6;"
            >
              <span class="port-label">Clock</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('notes')}"
              data-type="array"
              class="port input"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Notes</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('frequencies')}"
              data-type="array"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Freqs</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('step')}"
              data-type="number"
              class="port input"
              style="--port-color: #f59e0b;"
            >
              <span class="port-label">Step</span>
            </axon-port-in>

            <!-- Outputs -->
            <axon-port-out
              id="${this.engine.getPortId('trigger')}"
              data-type="boolean"
              class="port output"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Trigger</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('note')}"
              data-type="string"
              class="port output"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Note</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('freq')}"
              data-type="number"
              class="port output"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Freq</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('event')}"
              data-type="any"
              class="port output"
              style="--port-color: #a855f7;"
            >
              <span class="port-label">Event</span>
            </axon-port-out>
          </div>
        </div>
      `

      const modeSelect = this.querySelector<HTMLSelectElement>('.arp-mode-select')
      const octavesInput = this.querySelector<HTMLInputElement>('.arp-octaves-input')

      modeSelect?.addEventListener('change', () => {
        this.engine?.setInput('mode', modeSelect.value)
        this.engine?.updateData({ mode: modeSelect.value as any })
      })

      octavesInput?.addEventListener('input', () => {
        const val = parseInt(octavesInput.value, 10)
        if (!isNaN(val)) {
          this.engine?.setInput('octaves', val)
          this.engine?.updateData({ octaves: val })
        }
      })
    }

    const noteReadout = this.querySelector('.arp-note-readout')
    if (noteReadout) {
      noteReadout.textContent = `${currentNote} ${currentFreq > 0 ? `(${Math.round(currentFreq)} Hz)` : ''}`
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_ARPEGGIATOR_NODE)) {
  customElements.define(TAG_NAMES.AXON_ARPEGGIATOR_NODE, AxonArpeggiatorNode)
}
