import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import { createClockNode } from '../../nodes/clock.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import type { BaseNode } from '../../core/base.node'

export class AxonClockNode extends AxonBaseNodeElement<BaseNode> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): BaseNode {
    return createClockNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.CLOCK
    this.setAttribute('data-node-type', NODE_TYPES.CLOCK)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const hzVal = Number(this.engine.getInput('hz') ?? 30)
    const isHzConnected = this.isPortConnected('hz')

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>System Clock</h3>
        </div>
        <div class="node-body">
          <div class="port-grid">
            <!-- Frequency Input -->
            <axon-port-in
              id="${this.engine.getPortId('hz')}"
              data-type="number"
              class="port input"
              style="--port-color: var(--ui-port-number, #10b981);"
            >
              <span class="port-label">Freq</span>
              <div class="port-slot">
                <div class="clock-slot-wrapper" style="display: flex; align-items: center; gap: 4px;">
                  <ui-number-input
                    size="sm"
                    min="1"
                    max="240"
                    value="${hzVal}"
                    class="clock-hz-input"
                    style="width: 70px;"
                  ></ui-number-input>
                  <span style="font-size: 10px; color: var(--ui-color-text-muted, #94a3b8); font-family: var(--ui-font-mono, monospace);">Hz</span>
                </div>
              </div>
            </axon-port-in>

            <!-- Tick Output -->
            <axon-port-out
              id="${this.engine.getPortId('tick')}"
              data-type="number"
              class="port output"
              style="--port-color: var(--ui-port-number, #10b981);"
            >
              <span class="port-label">Tick</span>
            </axon-port-out>
          </div>
        </div>
      `

      const input = this.querySelector('.clock-hz-input')
      input?.addEventListener('ui-input', (e: Event) => {
        const val = Number((e as CustomEvent).detail.value)
        this.setInput('hz', val)
      })
    }

    const slotWrapper = this.querySelector<HTMLElement>('.clock-slot-wrapper')
    if (slotWrapper) {
      slotWrapper.style.display = isHzConnected ? 'none' : 'flex'
    }
    const input = this.querySelector<HTMLElement>('.clock-hz-input')
    if (input && !isHzConnected && document.activeElement !== input) {
      input.setAttribute('value', String(hzVal))
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_CLOCK_NODE)) {
  customElements.define(TAG_NAMES.AXON_CLOCK_NODE, AxonClockNode)
}
