import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createChordNode,
  type ChordNodeEngine,
} from '../../../nodes/audio/chord.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CHORD_TYPES = [
  'major',
  'minor',
  '7',
  'maj7',
  'min7',
  'dim',
  'aug',
  'sus2',
  'sus4',
]

/**
 * <axon-chord-node>
 * Chord Generator visual node.
 * Generates harmonic chords from root note, chord quality, and inversions.
 */
export class AxonChordNode extends AxonBaseNodeElement<ChordNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): ChordNodeEngine {
    return createChordNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.CHORD
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.CHORD)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const root = String(this.engine.getInput('root') ?? this.engine.data.root ?? 'C4')
    const type = String(this.engine.getInput('type') ?? this.engine.data.type ?? 'major')
    const inversion = Number(this.engine.getInput('inversion') ?? this.engine.data.inversion ?? 0)
    const notes = (this.engine.getOutput('notes') as string[]) ?? ['C4', 'E4', 'G4']
    const notesStr = Array.isArray(notes) ? notes.join(', ') : 'C4, E4, G4'

    if (!this.querySelector('.node-body')) {
      const rootOptions = ROOTS.map(
        (r) => `<option value="${r}4" ${r === root.replace(/\d/, '') ? 'selected' : ''}>${r}</option>`,
      ).join('')
      const typeOptions = CHORD_TYPES.map(
        (t) => `<option value="${t}" ${t === type ? 'selected' : ''}>${t}</option>`,
      ).join('')

      this.innerHTML = `
        <div class="node-header">
          <h3>🎹 Chord Generator</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate" style="display: flex; flex-direction: column; gap: 6px; padding: 6px 8px;">
            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Root & Type</span>
              <div style="display: flex; gap: 4px;">
                <select class="chord-root-select" style="background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px;">
                  ${rootOptions}
                </select>
                <select class="chord-type-select" style="background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px;">
                  ${typeOptions}
                </select>
              </div>
            </div>

            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Inversion</span>
              <input
                type="number"
                class="chord-inversion-input"
                min="0"
                max="3"
                value="${inversion}"
                style="width: 44px; background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px; text-align: center;"
              />
            </div>

            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Voicing</span>
              <span class="chord-notes-readout" style="font-family: var(--ui-font-mono, monospace); font-weight: bold; color: #10b981;">
                ${notesStr}
              </span>
            </div>
          </div>

          <div class="port-grid">
            <!-- Inputs -->
            <axon-port-in
              id="${this.engine.getPortId('root')}"
              data-type="string"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Root</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('type')}"
              data-type="string"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Type</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('inversion')}"
              data-type="number"
              class="port input"
              style="--port-color: #f59e0b;"
            >
              <span class="port-label">Inversion</span>
            </axon-port-in>

            <!-- Outputs -->
            <axon-port-out
              id="${this.engine.getPortId('notes')}"
              data-type="array"
              class="port output"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Notes</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('frequencies')}"
              data-type="array"
              class="port output"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Freqs</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('midis')}"
              data-type="array"
              class="port output"
              style="--port-color: #a855f7;"
            >
              <span class="port-label">Midis</span>
            </axon-port-out>
          </div>
        </div>
      `

      const rootSelect = this.querySelector<HTMLSelectElement>('.chord-root-select')
      const typeSelect = this.querySelector<HTMLSelectElement>('.chord-type-select')
      const inversionInput = this.querySelector<HTMLInputElement>('.chord-inversion-input')

      rootSelect?.addEventListener('change', () => {
        this.engine?.setInput('root', rootSelect.value)
        this.engine?.updateData({ root: rootSelect.value })
      })

      typeSelect?.addEventListener('change', () => {
        this.engine?.setInput('type', typeSelect.value)
        this.engine?.updateData({ type: typeSelect.value })
      })

      inversionInput?.addEventListener('input', () => {
        const val = parseInt(inversionInput.value, 10)
        if (!isNaN(val)) {
          this.engine?.setInput('inversion', val)
          this.engine?.updateData({ inversion: val })
        }
      })
    }

    const notesReadout = this.querySelector('.chord-notes-readout')
    if (notesReadout) {
      notesReadout.textContent = notesStr
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_CHORD_NODE)) {
  customElements.define(TAG_NAMES.AXON_CHORD_NODE, AxonChordNode)
}
