import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createParallelNode,
  type ParallelNodeEngine,
} from '../../../nodes/audio/parallel.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-parallel-node>
 * Pure Node Concurrent Layer Stack (Parallel polyphony / drum stack) visual node.
 * Features:
 * - Stacks multiple event streams concurrently into a unified output
 * - Live voice count monitor
 */
export class AxonParallelNode extends AxonBaseNodeElement<ParallelNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): ParallelNodeEngine {
    return createParallelNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.PARALLEL
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.PARALLEL)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const voiceCount = Number(this.engine.getOutput('voiceCount') ?? 0)

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>⫴ Parallel Layer</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate">
            <div class="audio-control-row">
              <span class="audio-control-label">Stack Polyphony</span>
              <span class="audio-control-val parallel-voice-count">${voiceCount} voices</span>
            </div>
          </div>
          <div class="port-grid">
            <!-- Inputs 1-4 -->
            <axon-port-in
              id="${this.engine.getPortId('in1')}"
              data-type="array"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">In 1</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('in2')}"
              data-type="array"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">In 2</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('in3')}"
              data-type="array"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">In 3</span>
            </axon-port-in>
            <axon-port-in
              id="${this.engine.getPortId('in4')}"
              data-type="array"
              class="port input"
              style="--port-color: #06b6d4;"
            >
              <span class="port-label">In 4</span>
            </axon-port-in>

            <!-- Merged Events Output -->
            <axon-port-out
              id="${this.engine.getPortId('events')}"
              data-type="array"
              class="port output"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Events</span>
            </axon-port-out>
          </div>
        </div>
      `
    }

    const voiceLabel = this.querySelector('.parallel-voice-count')
    if (voiceLabel) {
      voiceLabel.textContent = `${voiceCount} voices`
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_PARALLEL_NODE)) {
  customElements.define(TAG_NAMES.AXON_PARALLEL_NODE, AxonParallelNode)
}
