// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import { createCompareNode } from '../../../nodes/compare.node'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Comparison Node.
 * Compares input values `a` and `b` using relational operators (==, !=, >, <, >=, <=, TRUTHY, FALSY)
 * and outputs a boolean result.
 */
export class AxonCompareNode extends AxonBaseNodeElement {
  createEngine(options?: { id?: string; initialData?: any }) {
    return createCompareNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.COMPARE
    this.setAttribute('data-node-type', NODE_TYPES.COMPARE)
    this.classList.add('axon-compare-node')
    super.connectedCallback()
  }

  isPortWired(portName: string): boolean {
    if (this.isPortConnected(portName)) return true
    const parentGraph = this.graph || (this.closest('axon-graph') as any)
    if (parentGraph?.edges && Array.isArray(parentGraph.edges)) {
      const targetPortIdentifier = `${this.id || 'cmp'}:${portName}`
      return parentGraph.edges.some(
        (edge: any) => edge.to === targetPortIdentifier || edge.toPort?.id === targetPortIdentifier,
      )
    }
    return false
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const comparisonOperator = String(nodeConfiguration.operator || 'TRUTHY')
    const fallbackValueB = nodeConfiguration.b ?? ''
    const isPortBWired = this.isPortWired('b')

    // Incremental DOM update: preserve port custom elements to eliminate microtask re-entrancy loops
    const existingCard = this.querySelector('.compare-node-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== comparisonOperator) {
        titleElement.textContent = comparisonOperator
      }
      const operatorSelect = existingCard.querySelector<HTMLSelectElement>('.compare-op-select')
      if (operatorSelect && document.activeElement !== operatorSelect && operatorSelect.value !== comparisonOperator) {
        operatorSelect.value = comparisonOperator
      }
      const slotContainer = existingCard.querySelector('.compare-b-slot')
      if (slotContainer) {
        if (isPortBWired) {
          if (!slotContainer.querySelector('.slot-bound-badge')) {
            slotContainer.innerHTML =
              '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
          }
        } else {
          let bInputElement = slotContainer.querySelector<HTMLInputElement>('.compare-b-input')
          if (!bInputElement) {
            slotContainer.innerHTML = `<input type="text" class="node-inline-input compare-b-input" value="${fallbackValueB}" placeholder="val" style="width: 64px;" />`
            bInputElement = slotContainer.querySelector<HTMLInputElement>('.compare-b-input')
            if (bInputElement) this.attachBInputListeners(bInputElement)
          } else if (document.activeElement !== bInputElement && bInputElement.value !== String(fallbackValueB)) {
            bInputElement.value = String(fallbackValueB)
          }
        }
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card compare-node-card">
        <div class="data-node-header compare-node-header">
          <span class="card-type-label">Compare</span>
          <span class="card-id-label node-title">${comparisonOperator}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-input slot-item-row">
            <span class="port-label">op</span>
            <div class="node-row-control slot-control-container">
              <ui-select class="node-inline-select compare-op-select" size="sm" value="${comparisonOperator}" style="width: 90px;">
                <option value="==" ${comparisonOperator === '==' || comparisonOperator === 'EQUALS' ? 'selected' : ''}>==</option>
                <option value="!=" ${comparisonOperator === '!=' || comparisonOperator === 'NOT_EQUALS' ? 'selected' : ''}>!=</option>
                <option value=">" ${comparisonOperator === '>' || comparisonOperator === 'GREATER_THAN' ? 'selected' : ''}>&gt;</option>
                <option value="<" ${comparisonOperator === '<' || comparisonOperator === 'LESS_THAN' ? 'selected' : ''}>&lt;</option>
                <option value=">=" ${comparisonOperator === '>=' ? 'selected' : ''}>&gt;=</option>
                <option value="<=" ${comparisonOperator === '<=' ? 'selected' : ''}>&lt;=</option>
                <option value="TRUTHY" ${comparisonOperator === 'TRUTHY' ? 'selected' : ''}>TRUTHY</option>
                <option value="FALSY" ${comparisonOperator === 'FALSY' ? 'selected' : ''}>FALSY</option>
              </ui-select>
            </div>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'cmp'}:a" port-name="a" class="port input">
              <span class="port-label">a</span>
            </axon-port-in>
            <axon-port-out id="${this.id || 'cmp'}:result" port-name="result" data-type="boolean" class="port output">
              <span class="port-label">Result</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'cmp'}:b" port-name="b" class="port input">
              <span class="port-label">b</span>
            </axon-port-in>
            <div class="compare-b-slot">
              ${
                isPortBWired
                  ? '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
                  : `<input type="text" class="node-inline-input compare-b-input" value="${fallbackValueB}" placeholder="val" style="width: 64px;" />`
              }
            </div>
          </div>
        </div>
      </div>
    `

    const selectElement = this.querySelector<HTMLSelectElement>('.compare-op-select')
    if (selectElement) {
      const handleOperatorChange = (event: Event) => {
        const nextOperator = (event as CustomEvent).detail?.value || selectElement.value
        const currentConfiguration = this.nodeData || (this.engine as any)?.data || {}
        currentConfiguration.operator = nextOperator
        this.nodeData = currentConfiguration
        this.setInput('operator', nextOperator)
        const titleElement = this.querySelector('.node-title')
        if (titleElement) titleElement.textContent = nextOperator
      }
      selectElement.addEventListener('change', handleOperatorChange)
      selectElement.addEventListener('ui-select-change', handleOperatorChange)
    }

    const bInputElement = this.querySelector<HTMLInputElement>('.compare-b-input')
    if (bInputElement) {
      this.attachBInputListeners(bInputElement)
    }
  }

  private attachBInputListeners(bInputElement: HTMLInputElement) {
    bInputElement.addEventListener('pointerdown', (event) => event.stopPropagation())
    bInputElement.addEventListener('input', () => {
      const rawValue = bInputElement.value
      const parsedValue = rawValue !== '' && !Number.isNaN(Number(rawValue)) ? Number(rawValue) : rawValue
      const currentConfiguration = this.nodeData || (this.engine as any)?.data || {}
      currentConfiguration.b = parsedValue
      this.nodeData = currentConfiguration
      this.setInput('b', parsedValue)
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_COMPARE_NODE)) {
  customElements.define(TAG_NAMES.AXON_COMPARE_NODE, AxonCompareNode)
}
