import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createEuclideanNode,
  type EuclideanNodeEngine,
} from '../../../nodes/audio/euclidean.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-euclidean-node>
 * Euclidean Algorithm Rhythm Generator visual node.
 * Generates maximally distributed rhythms across N steps with K pulses.
 */
export class AxonEuclideanNode extends AxonBaseNodeElement<EuclideanNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): EuclideanNodeEngine {
    return createEuclideanNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.EUCLIDEAN
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.EUCLIDEAN)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const steps = Number(this.engine.getInput('steps') ?? this.engine.data.steps ?? 16)
    const hits = Number(this.engine.getInput('hits') ?? this.engine.data.hits ?? 4)
    const rotate = Number(this.engine.getInput('rotate') ?? this.engine.data.rotate ?? 0)
    const currentStep = Number(this.engine.getOutput('stepIndex') ?? 0)

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>🥁 Euclidean Rhythm</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate" style="display: flex; flex-direction: column; gap: 6px; padding: 6px 8px;">
            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Steps / Pulses</span>
              <div style="display: flex; gap: 4px; align-items: center;">
                <input
                  type="number"
                  class="euclidean-steps-input"
                  min="1"
                  max="32"
                  value="${steps}"
                  style="width: 44px; background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px; text-align: center;"
                />
                <span style="color: #64748b;">/</span>
                <input
                  type="number"
                  class="euclidean-pulses-input"
                  min="0"
                  max="32"
                  value="${hits}"
                  style="width: 44px; background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px; text-align: center;"
                />
              </div>
            </div>

            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Rotation</span>
              <input
                type="number"
                class="euclidean-rotation-input"
                min="0"
                max="31"
                value="${rotate}"
                style="width: 44px; background: rgba(0,0,0,0.3); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: #fff; font-size: 11px; padding: 2px 4px; text-align: center;"
              />
            </div>

            <div class="audio-control-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span class="audio-control-label">Current Step</span>
              <span class="euclidean-step-readout" style="font-family: var(--ui-font-mono, monospace); font-weight: bold; color: #10b981;">
                ${currentStep + 1} / ${steps}
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
              id="${this.engine.getPortId('steps')}"
              data-type="number"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Steps</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('hits')}"
              data-type="number"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Hits</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('rotate')}"
              data-type="number"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">Rotate</span>
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
              id="${this.engine.getPortId('stepIndex')}"
              data-type="number"
              class="port output"
              style="--port-color: #f59e0b;"
            >
              <span class="port-label">Step</span>
            </axon-port-out>
            <axon-port-out
              id="${this.engine.getPortId('pattern')}"
              data-type="array"
              class="port output"
              style="--port-color: #a855f7;"
            >
              <span class="port-label">Pattern</span>
            </axon-port-out>
          </div>
        </div>
      `

      const stepsInput = this.querySelector<HTMLInputElement>('.euclidean-steps-input')
      const pulsesInput = this.querySelector<HTMLInputElement>('.euclidean-pulses-input')
      const rotationInput = this.querySelector<HTMLInputElement>('.euclidean-rotation-input')

      stepsInput?.addEventListener('input', () => {
        const val = parseInt(stepsInput.value, 10)
        if (!isNaN(val)) {
          this.engine?.setInput('steps', val)
          this.engine?.updateData({ steps: val })
        }
      })

      pulsesInput?.addEventListener('input', () => {
        const val = parseInt(pulsesInput.value, 10)
        if (!isNaN(val)) {
          this.engine?.setInput('hits', val)
          this.engine?.updateData({ hits: val })
        }
      })

      rotationInput?.addEventListener('input', () => {
        const val = parseInt(rotationInput.value, 10)
        if (!isNaN(val)) {
          this.engine?.setInput('rotate', val)
          this.engine?.updateData({ rotate: val })
        }
      })
    }

    const stepReadout = this.querySelector('.euclidean-step-readout')
    if (stepReadout) {
      stepReadout.textContent = `${currentStep + 1} / ${steps}`
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_EUCLIDEAN_NODE)) {
  customElements.define(TAG_NAMES.AXON_EUCLIDEAN_NODE, AxonEuclideanNode)
}
