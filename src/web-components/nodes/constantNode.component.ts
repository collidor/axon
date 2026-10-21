import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import { createConstantNode } from '../../nodes/constant.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import type { BaseNode } from '../../core/base.node'

export class AxonConstantNode extends AxonBaseNodeElement<BaseNode> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): BaseNode {
    return createConstantNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.CONSTANT
    this.setAttribute('data-node-type', NODE_TYPES.CONSTANT)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const val = Number(this.engine.getOutput('value') ?? 0)

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>Constant</h3>
        </div>
        <div class="node-body">
          <div class="constant-config" style="padding: 6px 12px; display: flex; flex-direction: column; gap: 3px;">
            <label style="font-size: 9px; text-transform: uppercase; color: var(--ui-color-text-muted, #94a3b8); font-weight: 700; letter-spacing: 0.05em;">Value</label>
            <ui-number-input
              size="sm"
              value="${val}"
              class="constant-input"
            ></ui-number-input>
          </div>
          <div class="port-grid">
            <axon-port-out
              id="${this.engine.getPortId('value')}"
              data-type="number"
              class="port output"
              style="--port-color: var(--ui-port-number, #10b981);"
            >
              <span class="port-label">Out</span>
            </axon-port-out>
          </div>
        </div>
      `

      const input = this.querySelector('.constant-input')
      input?.addEventListener('ui-input', (e: Event) => {
        const v = Number((e as CustomEvent).detail.value)
        this.setInput('value', v)
      })
    }

    const input = this.querySelector('.constant-input')
    if (input && document.activeElement !== input) {
      input.setAttribute('value', String(val))
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_CONSTANT_NODE)) {
  customElements.define(TAG_NAMES.AXON_CONSTANT_NODE, AxonConstantNode)
}
