import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createScaleQuantizerNode,
  type ScaleQuantizerNodeEngine,
} from '../../../nodes/audio/scaleQuantizer.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALES = [
  'major',
  'minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'pentatonic',
  'pentatonicMinor',
  'blues',
]

/**
 * <axon-scale-quantizer-node>
 * Music Theory Scale Quantizer visual node.
 * Quantizes continuous frequency or arbitrary pitch inputs to musical scale degrees.
 */
export class AxonScaleQuantizerNode extends AxonBaseNodeElement<ScaleQuantizerNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): ScaleQuantizerNodeEngine {
    return createScaleQuantizerNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.SCALE_QUANTIZER
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.SCALE_QUANTIZER)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const root = String(this.engine.getInput('root') ?? this.engine.data.root ?? 'C')
    const scale = String(this.engine.getInput('scale') ?? this.engine.data.scale ?? 'major')
    const note = String(this.engine.getOutput('quantizedNote') ?? 'C4')
    const midi = Number(this.engine.getOutput('midi') ?? 60)

    if (!this.querySelector('.node-body')) {
      const rootOptions = ROOTS.map(
        (r) => `<option value="${r}" ${r === root ? 'selected' : ''}>${r}</option>`,
      ).join('')
      const scaleOptions = SCALES.map(
        (s) => `<option value="${s}" ${s === scale ? 'selected' : ''}>${s}</option>`,
      ).join('')

      this.innerHTML = `
        <div class="node-header">
          <h3>🎼 Scale Quantizer</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate" style="display: flex; flex-direction: column; gap: 6px; padding: 6px 8px;">
            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Root & Scale</span>
              <div style="display: flex; gap: 4px;">
                <select class="quantizer-root-select" style="background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px;">
                  ${rootOptions}
                </select>
                <select class="quantizer-scale-select" style="background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px;">
                  ${scaleOptions}
                </select>
              </div>
            </div>

            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Snapped Note</span>
              <span class="quantizer-note-readout" style="font-family: var(--ui-font-mono, monospace); font-weight: bold; color: #10b981;">
                ${note} (MIDI ${midi})
              </span>
            </div>
          </div>

          <div class="port-grid">
            <!-- Inputs -->
            <axon-port-in
              id="${this.engine.getPortId('pitch')}"
              data-type="any"
              class="port input"
              style="--port-color: #f59e0b;"
            >
              <span class="port-label">Pitch</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('root')}"
              data-type="string"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Root</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('scale')}"
              data-type="string"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Scale</span>
            </axon-port-in>

            <!-- Outputs -->
            <axon-port-out
              id="${this.engine.getPortId('quantizedNote')}"
              data-type="string"
              class="port output"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Note</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('quantizedFreq')}"
              data-type="number"
              class="port output"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Freq</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('midi')}"
              data-type="number"
              class="port output"
              style="--port-color: #a855f7;"
            >
              <span class="port-label">MIDI</span>
            </axon-port-out>
          </div>
        </div>
      `

      const rootSelect = this.querySelector<HTMLSelectElement>('.quantizer-root-select')
      const scaleSelect = this.querySelector<HTMLSelectElement>('.quantizer-scale-select')

      rootSelect?.addEventListener('change', () => {
        this.engine?.setInput('root', rootSelect.value)
        this.engine?.updateData({ root: rootSelect.value })
      })

      scaleSelect?.addEventListener('change', () => {
        this.engine?.setInput('scale', scaleSelect.value)
        this.engine?.updateData({ scale: scaleSelect.value })
      })
    }

    const noteReadout = this.querySelector('.quantizer-note-readout')
    if (noteReadout) {
      noteReadout.textContent = `${note} (MIDI ${midi})`
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_SCALE_QUANTIZER_NODE)) {
  customElements.define(TAG_NAMES.AXON_SCALE_QUANTIZER_NODE, AxonScaleQuantizerNode)
}
