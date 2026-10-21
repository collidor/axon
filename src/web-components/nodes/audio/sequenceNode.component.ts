import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createSequenceNode,
  type SequenceNodeEngine,
} from '../../../nodes/audio/sequence.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-sequence-node>
 * Pure Node Time Subdivision Sequencer visual node.
 * Features:
 * - Editable sequence of notes or drum triggers (comma-separated or chips)
 * - Dynamic division counter and active step playhead indicator
 * - Slices cycle evenly across slots
 */
export class AxonSequenceNode extends AxonBaseNodeElement<SequenceNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): SequenceNodeEngine {
    return createSequenceNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.SEQUENCE
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.SEQUENCE)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const notes = this.engine.getNotes()
    const stepIdx = this.engine.getOutput('stepIndex')
    const activeNote = this.engine.getOutput('activeNote')

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>♪ Sequence</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate">
            <div class="audio-control-row">
              <span class="audio-control-label">Step Sequence</span>
            </div>
            <input
              type="text"
              class="sequence-notes-input"
              value="${this.escapeHtml(notes.join(' '))}"
              placeholder="e.g. C4 E4 G4 B4 or bd bd sd rest"
              title="Space-separated musical notes or drum tokens"
              style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.5); border: 1px solid #334155; border-radius: 4px; color: #38bdf8; font-family: monospace; font-size: 11px; padding: 4px 6px;"
            />
            <div class="mini-notation-playhead" style="margin-top: 4px;">
              <span class="audio-control-label sequence-step-label">Step: ${stepIdx !== undefined && stepIdx !== null ? stepIdx : '-'}</span>
              <span class="playhead-pulse">●</span>
              <span class="audio-control-val sequence-note-val">${activeNote ? String(activeNote) : '-'}</span>
            </div>
          </div>
          <div class="data-node-body" style="padding: 4px 0 2px 0;">
            <div class="data-node-row port-row-pair">
              <!-- Clock Arc Input -->
              <axon-port-in
                id="${this.engine.getPortId('arc')}"
                data-type="object"
                class="port input"
                style="--port-color: #8b5cf6;"
              >
                <span class="port-label">Arc (Clk)</span>
              </axon-port-in>

              <!-- Events Output -->
              <axon-port-out
                id="${this.engine.getPortId('events')}"
                data-type="array"
                class="port output"
                style="--port-color: #f59e0b;"
              >
                <span class="port-label">Events</span>
              </axon-port-out>
            </div>

            <div class="data-node-row port-row-pair">
              <!-- Notes Input -->
              <axon-port-in
                id="${this.engine.getPortId('notes')}"
                data-type="array"
                class="port input"
                style="--port-color: #06b6d4;"
              >
                <span class="port-label">Notes</span>
              </axon-port-in>

              <!-- Active Note Output -->
              <axon-port-out
                id="${this.engine.getPortId('activeNote')}"
                data-type="string"
                class="port output"
                style="--port-color: #ec4899;"
              >
                <span class="port-label">Note</span>
              </axon-port-out>
            </div>
          </div>
        </div>
      `

      const input = this.querySelector<HTMLInputElement>('.sequence-notes-input')
      input?.addEventListener('input', (e: Event) => {
        const val = (e.target as HTMLInputElement).value
        const parsed = val.trim().split(/\s+/).filter(Boolean)
        this.engine?.setNotes(parsed)
      })
    }

    const stepLabel = this.querySelector('.sequence-step-label')
    if (stepLabel) {
      stepLabel.textContent = `Step: ${stepIdx !== undefined && stepIdx !== null ? stepIdx : '-'}`
    }

    const noteLabel = this.querySelector('.sequence-note-val')
    if (noteLabel) {
      noteLabel.textContent = activeNote ? String(activeNote) : '-'
    }

    const pulseEl = this.querySelector('.playhead-pulse')
    if (pulseEl) {
      pulseEl.classList.add('is-pulsing')
      setTimeout(() => pulseEl.classList.remove('is-pulsing'), 80)
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
}

if (!customElements.get(TAG_NAMES.AXON_SEQUENCE_NODE)) {
  customElements.define(TAG_NAMES.AXON_SEQUENCE_NODE, AxonSequenceNode)
}
