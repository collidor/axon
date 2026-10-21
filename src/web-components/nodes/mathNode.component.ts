import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import { createMathNode } from '../../nodes/math.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import type { BaseNode } from '../../core/base.node'

export class AxonMathNode extends AxonBaseNodeElement<BaseNode> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): BaseNode {
    return createMathNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.MATH
    this.setAttribute('data-node-type', NODE_TYPES.MATH)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const isAConnected = this.isPortConnected('a')
    const isBConnected = this.isPortConnected('b')
    const isOpConnected = this.isPortConnected('operator')

    const aVal = Number(this.engine.getInput('a') ?? 0)
    const bVal = Number(this.engine.getInput('b') ?? 0)
    const rawOp = this.engine.getInput('operator')
    const opVal = typeof rawOp === 'string' ? rawOp : 'ADD'
    const resVal = this.engine.getOutput('result')
    const formattedRes =
      typeof resVal === 'number' ? resVal.toFixed(2) : typeof resVal === 'string' ? resVal : '0'

    // 1. Initial build if DOM not present
    if (!this.querySelector('.node-body')) {
      this.innerHTML = /*html*/ `
        <div class="node-header">
          <h3>Math Processor</h3>
        </div>
        <div class="node-body">
          <div class="port-grid">
            <!-- Port A -->
            <axon-port-in
              id="${this.engine.getPortId('a')}"
              data-type="number"
              class="port input"
              style="--port-color: var(--ui-port-number, #10b981);"
            >
              <span class="port-label">A</span>
              <div class="port-slot">
                <ui-number-input
                  size="sm"
                  value="${aVal}"
                  class="node-control math-input-a"
                  style="width: 100%; max-width: 120px;"
                ></ui-number-input>
              </div>
            </axon-port-in>

            <!-- Port B -->
            <axon-port-in
              id="${this.engine.getPortId('b')}"
              data-type="number"
              class="port input"
              style="--port-color: var(--ui-port-number, #10b981);"
            >
              <span class="port-label">B</span>
              <div class="port-slot">
                <ui-number-input
                  size="sm"
                  value="${bVal}"
                  class="node-control math-input-b"
                  style="width: 100%; max-width: 120px;"
                ></ui-number-input>
              </div>
            </axon-port-in>

            <!-- Operator Port -->
            <axon-port-in
              id="${this.engine.getPortId('operator')}"
              data-type="string"
              class="port input"
              style="--port-color: var(--ui-port-string, #38bdf8);"
            >
              <span class="port-label">OP</span>
              <div class="port-slot">
                <ui-select
                  size="sm"
                  value="${opVal}"
                  class="node-control math-select-op"
                  style="width: 100%; max-width: 120px;"
                >
                  <option value="ADD" ${opVal === 'ADD' ? 'selected' : ''}>+</option>
                  <option value="SUBTRACT" ${opVal === 'SUBTRACT' ? 'selected' : ''}>-</option>
                  <option value="MULTIPLY" ${opVal === 'MULTIPLY' ? 'selected' : ''}>×</option>
                  <option value="DIVIDE" ${opVal === 'DIVIDE' ? 'selected' : ''}>÷</option>
                  <option value="POWER" ${opVal === 'POWER' ? 'selected' : ''}>^</option>
                  <option value="MODULO" ${opVal === 'MODULO' ? 'selected' : ''}>%</option>
                </ui-select>
              </div>
            </axon-port-in>

            <!-- Result Output -->
            <axon-port-out
              id="${this.engine.getPortId('result')}"
              data-type="number"
              class="port output"
              style="--port-color: var(--ui-port-number, #10b981);"
            >
              <div class="port-slot">
                <ui-badge variant="success" size="sm" class="math-res-badge">${formattedRes}</ui-badge>
              </div>
              <span class="port-label">Result</span>
            </axon-port-out>
          </div>
        </div>
      `

      // Wire events once
      const inputA = this.querySelector<HTMLElement>('.math-input-a')
      inputA?.addEventListener('ui-input', (e: Event) => {
        const val = Number((e as CustomEvent).detail.value)
        this.setInput('a', val)
      })

      const inputB = this.querySelector<HTMLElement>('.math-input-b')
      inputB?.addEventListener('ui-input', (e: Event) => {
        const val = Number((e as CustomEvent).detail.value)
        this.setInput('b', val)
      })

      const selectOp = this.querySelector<HTMLElement>('.math-select-op')
      selectOp?.addEventListener('ui-change', (e: Event) => {
        const val = String((e as CustomEvent).detail.value)
        this.setInput('operator', val)
      })
    }

    // 2. Incremental DOM updates without wiping ports
    const inputA = this.querySelector<HTMLElement>('.math-input-a')
    if (inputA) {
      inputA.style.display = isAConnected ? 'none' : ''
      if (!isAConnected && document.activeElement !== inputA) {
        inputA.setAttribute('value', String(aVal))
      }
    }

    const inputB = this.querySelector<HTMLElement>('.math-input-b')
    if (inputB) {
      inputB.style.display = isBConnected ? 'none' : ''
      if (!isBConnected && document.activeElement !== inputB) {
        inputB.setAttribute('value', String(bVal))
      }
    }

    const selectOp = this.querySelector<HTMLElement>('.math-select-op')
    if (selectOp) {
      selectOp.style.display = isOpConnected ? 'none' : ''
      if (!isOpConnected && document.activeElement !== selectOp) {
        selectOp.setAttribute('value', opVal)
      }
    }

    const resBadge = this.querySelector('.math-res-badge')
    if (resBadge) {
      resBadge.textContent = formattedRes
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_MATH_NODE)) {
  customElements.define(TAG_NAMES.AXON_MATH_NODE, AxonMathNode)
}
