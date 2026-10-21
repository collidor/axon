import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createStepSequencerNode,
  type StepSequencerNodeEngine,
} from '../../../nodes/audio/stepSequencer.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-step-sequencer-node>
 * 16-Step visual LED drum and note sequencer.
 * Features:
 * - 16 clickable LED step buttons with click-to-toggle activation
 * - Running playhead sweep synchronized with cycle clock
 * - Root note selector
 */
export class AxonStepSequencerNode extends AxonBaseNodeElement<StepSequencerNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): StepSequencerNodeEngine {
    return createStepSequencerNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.STEP_SEQUENCER
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.STEP_SEQUENCER)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const currentStep = Number(this.engine.getOutput('currentStep') ?? 0)
    const steps = this.engine.getSteps()
    const rootNote = String(this.engine.getInput('rootNote') ?? this.engine.data.rootNote ?? 'C3')

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>▦ Step Sequencer</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate">
            <div class="audio-control-row">
              <span class="audio-control-label">16 Steps</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="audio-control-label">Root:</span>
                <input
                  type="text"
                  class="step-root-input"
                  value="${rootNote}"
                  style="width: 42px; background: rgba(0,0,0,0.4); border: 1px solid #334155; border-radius: 3px; color: #38bdf8; font-family: var(--ui-font-mono, monospace); font-size: 11px; text-align: center;"
                />
              </div>
            </div>

            <div class="step-sequencer-grid">
              ${steps
                .map(
                  (s, i) => `
                <button
                  type="button"
                  class="step-led-btn ${s.active ? 'is-active' : ''} ${i === currentStep ? 'is-current-step' : ''}"
                  data-step-index="${i}"
                  title="Step ${i + 1}"
                >
                  ${i + 1}
                </button>
              `,
                )
                .join('')}
            </div>
          </div>
          <div class="port-grid">
            <!-- Clock Trigger Input -->
            <axon-port-in
              id="${this.engine.getPortId('clock')}"
              data-type="boolean"
              class="port input"
              style="--port-color: #8b5cf6;"
            >
              <span class="port-label">Clk</span>
            </axon-port-in>

            <!-- Step Position Input -->
            <axon-port-in
              id="${this.engine.getPortId('step')}"
              data-type="number"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Step</span>
            </axon-port-in>

            <!-- Trigger Output -->
            <axon-port-out
              id="${this.engine.getPortId('trigger')}"
              data-type="boolean"
              class="port output"
              style="--port-color: #f59e0b;"
            >
              <span class="port-label">Trig</span>
            </axon-port-out>

            <!-- Note Name Output -->
            <axon-port-out
              id="${this.engine.getPortId('note')}"
              data-type="string"
              class="port output"
              style="--port-color: #ec4899;"
            >
              <span class="port-label">Note</span>
            </axon-port-out>

            <!-- Frequency Output -->
            <axon-port-out
              id="${this.engine.getPortId('freq')}"
              data-type="number"
              class="port output"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Freq</span>
            </axon-port-out>

            <!-- Event Output -->
            <axon-port-out
              id="${this.engine.getPortId('event')}"
              data-type="object"
              class="port output"
              style="--port-color: #a855f7;"
            >
              <span class="port-label">Event</span>
            </axon-port-out>
          </div>
        </div>
      `

      // Toggle step activation on button click
      const grid = this.querySelector('.step-sequencer-grid')
      grid?.addEventListener('click', (e: Event) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.step-led-btn')
        if (!btn || !this.engine) return
        const idx = Number(btn.getAttribute('data-step-index'))
        const currentSteps = this.engine.getSteps()
        const currentItem = currentSteps[idx]
        if (currentItem) {
          const newActive = !currentItem.active
          this.engine.setStepItem(idx, { active: newActive })
          btn.classList.toggle('is-active', newActive)
        }
      })

      const rootInput = this.querySelector<HTMLInputElement>('.step-root-input')
      rootInput?.addEventListener('change', (e: Event) => {
        const val = (e.target as HTMLInputElement).value
        this.setInput('rootNote', val)
        if (this.engine) this.engine.data.rootNote = val
      })
    }

    // Refresh LED state and playhead highlight
    const stepButtons = this.querySelectorAll<HTMLButtonElement>('.step-led-btn')
    stepButtons.forEach((btn, i) => {
      const stepItem = steps[i]
      if (stepItem) {
        btn.classList.toggle('is-active', stepItem.active)
      }
      btn.classList.toggle('is-current-step', i === currentStep)
    })
  }
}

if (!customElements.get(TAG_NAMES.AXON_STEP_SEQUENCER_NODE)) {
  customElements.define(TAG_NAMES.AXON_STEP_SEQUENCER_NODE, AxonStepSequencerNode)
}
