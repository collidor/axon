// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import { createGateNode } from '../../../nodes/gate.node'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Data Gate Node.
 * When the open signal is true, input data is forwarded to the output.
 * When closed, the gate holds transmission.
 */
export class AxonGateNode extends AxonBaseNodeElement {
  createEngine(options?: { id?: string; initialData?: any }) {
    return createGateNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.GATE
    this.setAttribute('data-node-type', NODE_TYPES.GATE)
    this.classList.add('axon-gate-node')
    super.connectedCallback()
  }

  isPortWired(portName: string): boolean {
    if (this.isPortConnected(portName)) return true
    const parentGraph = this.graph || (this.closest('axon-graph') as any)
    if (parentGraph?.edges && Array.isArray(parentGraph.edges)) {
      const targetPortIdentifier = `${this.id || 'gt'}:${portName}`
      return parentGraph.edges.some(
        (edge: any) => edge.to === targetPortIdentifier || edge.toPort?.id === targetPortIdentifier,
      )
    }
    return false
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const isGateOpen = Boolean(nodeConfiguration.open)
    const isOpenSignalWired = this.isPortWired('open')

    // Incremental DOM update: preserve port elements and toggle gate button state
    const existingCard = this.querySelector('.gate-node-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement) {
        titleElement.textContent = isGateOpen ? 'Open' : 'Closed'
      }
      const slotContainer = existingCard.querySelector('.gate-open-slot')
      if (slotContainer) {
        if (isOpenSignalWired) {
          if (!slotContainer.querySelector('.slot-bound-badge')) {
            slotContainer.innerHTML =
              '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
          }
        } else {
          let toggleButton = slotContainer.querySelector<HTMLButtonElement>('.gate-toggle-btn')
          if (!toggleButton) {
            slotContainer.innerHTML = `<button type="button" class="node-inline-btn gate-toggle-btn">${isGateOpen ? 'Open' : 'Closed'}</button>`
            toggleButton = slotContainer.querySelector<HTMLButtonElement>('.gate-toggle-btn')
            if (toggleButton) this.attachGateButtonListeners(toggleButton)
          } else {
            toggleButton.textContent = isGateOpen ? 'Open' : 'Closed'
          }
        }
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card gate-node-card">
        <div class="data-node-header gate-node-header">
          <span class="card-type-label">Data Gate</span>
          <span class="card-id-label node-title">${isGateOpen ? 'Open' : 'Closed'}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'gt'}:open" port-name="open" data-type="boolean" class="port input">
              <span class="port-label">Signal (open)</span>
            </axon-port-in>
            <div class="gate-open-slot">
              ${
                isOpenSignalWired
                  ? '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
                  : `<button type="button" class="node-inline-btn gate-toggle-btn">${isGateOpen ? 'Open' : 'Closed'}</button>`
              }
            </div>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'gt'}:data" port-name="data" class="port input">
              <span class="port-label">Data In</span>
            </axon-port-in>
            <axon-port-out id="${this.id || 'gt'}:output" port-name="output" class="port output">
              <span class="port-label">Data Out</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `

    const toggleButton = this.querySelector<HTMLButtonElement>('.gate-toggle-btn')
    if (toggleButton) {
      this.attachGateButtonListeners(toggleButton)
    }
  }

  private attachGateButtonListeners(toggleButton: HTMLButtonElement) {
    toggleButton.addEventListener('pointerdown', (event) => event.stopPropagation())
    toggleButton.addEventListener('click', (event) => {
      event.stopPropagation()
      const currentConfiguration = this.nodeData || (this.engine as any)?.data || {}
      const nextOpenState = !Boolean(currentConfiguration.open)
      currentConfiguration.open = nextOpenState
      this.nodeData = currentConfiguration
      this.setInput('open', nextOpenState)
      this.render()
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_GATE_NODE)) {
  customElements.define(TAG_NAMES.AXON_GATE_NODE, AxonGateNode)
}
