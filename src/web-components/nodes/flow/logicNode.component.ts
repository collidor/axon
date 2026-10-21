// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import { createLogicNode } from '../../../nodes/logic.node'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Boolean Logic Gate.
 * Evaluates standard logic operations (AND, OR, NOT, XOR, NAND, NOR, XNOR)
 * over boolean inputs `a` and `b`.
 */
export class AxonLogicNode extends AxonBaseNodeElement {
  createEngine(options?: { id?: string; initialData?: any }) {
    return createLogicNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.LOGIC
    this.setAttribute('data-node-type', NODE_TYPES.LOGIC)
    this.classList.add('axon-logic-node')
    super.connectedCallback()
  }

  isPortWired(portName: string): boolean {
    if (this.isPortConnected(portName)) return true
    const parentGraph = this.graph || (this.closest('axon-graph') as any)
    if (parentGraph?.edges && Array.isArray(parentGraph.edges)) {
      const targetPortIdentifier = `${this.id || 'log'}:${portName}`
      return parentGraph.edges.some(
        (edge: any) => edge.to === targetPortIdentifier || edge.toPort?.id === targetPortIdentifier,
      )
    }
    return false
  }

  private attachSelectListeners(operatorSelect: HTMLElement) {
    const inputInteractionEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
    for (const eventName of inputInteractionEvents) {
      operatorSelect.addEventListener(eventName, (event) => event.stopPropagation())
    }

    const handleOperatorChange = () => {
      const selectedOperator = ((operatorSelect as any).value || 'AND').toUpperCase()
      const currentConfiguration = this.nodeData || (this.engine as any)?.data || {}
      currentConfiguration.operator = selectedOperator
      ;(this as any)._nodeData = currentConfiguration
      if (this.engine) {
        ;(this.engine as any).data = currentConfiguration
        this.engine.setInput('operator', selectedOperator)
      }

      const titleElement = this.querySelector('.node-title')
      if (titleElement) {
        titleElement.textContent = `${selectedOperator} Gate`
      }

      this.dispatchEvent(
        new CustomEvent('node-data-change', {
          detail: { id: this.id, data: currentConfiguration, operator: selectedOperator },
          bubbles: true,
          composed: true,
        }),
      )
    }

    operatorSelect.addEventListener('change', handleOperatorChange)
    operatorSelect.addEventListener('ui-select-change', handleOperatorChange)
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const operator = (nodeConfiguration.operator || 'AND').toUpperCase()
    const isOperatorPortWired = this.isPortWired('operator')

    // Incremental DOM update: preserve ports and update only title and dynamic operator selector
    const existingCard = this.querySelector('.logic-node-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== `${operator} Gate`) {
        titleElement.textContent = `${operator} Gate`
      }

      const operatorRow = existingCard.querySelector('.logic-operator-row')
      if (operatorRow) {
        operatorRow.classList.toggle('is-wired', isOperatorPortWired)
        const controlContainer = operatorRow.querySelector('.slot-control-container')
        if (controlContainer) {
          if (isOperatorPortWired) {
            if (!controlContainer.querySelector('.slot-bound-badge')) {
              controlContainer.innerHTML =
                '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
            }
          } else {
            let selectElement = controlContainer.querySelector<HTMLSelectElement>('.logic-op-select')
            if (!selectElement) {
              controlContainer.innerHTML = `
                <ui-select class="node-inline-select logic-op-select" size="sm" value="${operator}" style="width: 85px;">
                  <option value="AND" ${operator === 'AND' ? 'selected' : ''}>AND</option>
                  <option value="OR" ${operator === 'OR' ? 'selected' : ''}>OR</option>
                  <option value="NOT" ${operator === 'NOT' ? 'selected' : ''}>NOT</option>
                  <option value="XOR" ${operator === 'XOR' ? 'selected' : ''}>XOR</option>
                  <option value="NAND" ${operator === 'NAND' ? 'selected' : ''}>NAND</option>
                  <option value="NOR" ${operator === 'NOR' ? 'selected' : ''}>NOR</option>
                  <option value="XNOR" ${operator === 'XNOR' ? 'selected' : ''}>XNOR</option>
                </ui-select>
              `
              selectElement = controlContainer.querySelector<HTMLSelectElement>('.logic-op-select')
              if (selectElement) this.attachSelectListeners(selectElement)
            } else if (document.activeElement !== selectElement && selectElement.value !== operator) {
              selectElement.value = operator
            }
          }
        }
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card logic-node-card">
        <div class="data-node-header logic-node-header">
          <span class="card-type-label">Logic Gate</span>
          <span class="card-id-label node-title">${operator} Gate</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-input slot-item-row logic-operator-row ${isOperatorPortWired ? 'is-wired' : ''}">
            <axon-port-in
              id="${this.id || 'log'}:operator"
              port-name="operator"
              data-type="string"
              class="port input"
            >
              <span class="port-label">op</span>
            </axon-port-in>
            <div class="node-row-control slot-control-container">
              ${
                isOperatorPortWired
                  ? '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
                  : `
                <ui-select class="node-inline-select logic-op-select" size="sm" value="${operator}" style="width: 85px;">
                  <option value="AND" ${operator === 'AND' ? 'selected' : ''}>AND</option>
                  <option value="OR" ${operator === 'OR' ? 'selected' : ''}>OR</option>
                  <option value="NOT" ${operator === 'NOT' ? 'selected' : ''}>NOT</option>
                  <option value="XOR" ${operator === 'XOR' ? 'selected' : ''}>XOR</option>
                  <option value="NAND" ${operator === 'NAND' ? 'selected' : ''}>NAND</option>
                  <option value="NOR" ${operator === 'NOR' ? 'selected' : ''}>NOR</option>
                  <option value="XNOR" ${operator === 'XNOR' ? 'selected' : ''}>XNOR</option>
                </ui-select>
              `
              }
            </div>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'log'}:a" port-name="a" data-type="boolean" class="port input">
              <span class="port-label">a</span>
            </axon-port-in>
            <axon-port-out id="${this.id || 'log'}:result" port-name="result" data-type="boolean" class="port output">
              <span class="port-label">Result</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'log'}:b" port-name="b" data-type="boolean" class="port input">
              <span class="port-label">b</span>
            </axon-port-in>
            <span></span>
          </div>
        </div>
      </div>
    `

    const selectElement = this.querySelector<HTMLSelectElement>('.logic-op-select')
    if (selectElement) {
      this.attachSelectListeners(selectElement)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_LOGIC_NODE)) {
  customElements.define(TAG_NAMES.AXON_LOGIC_NODE, AxonLogicNode)
}
