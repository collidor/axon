import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  type QueryParamNodeEngine,
  createQueryParamNode,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'

/**
 * Custom element representing a single URL query string parameter (e.g., `?page=2`).
 * Supports dynamic binding via an input port or inline text field input.
 */
export class AxonQueryParamNode extends AxonBaseNodeElement<QueryParamNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): QueryParamNodeEngine {
    return createQueryParamNode(options)
  }

  connectedCallback(): void {
    this.axonNodeType = NODE_TYPES.QUERY_PARAM
    this.setAttribute('data-node-type', NODE_TYPES.QUERY_PARAM)
    this.classList.add('axon-query-param-node')
    super.connectedCallback()
  }

  /**
   * Checks whether the specified port has an incoming connection attached.
   */
  isPortWired(portName: string): boolean {
    if (this.isPortConnected(portName)) return true
    const parentGraph = this.graph || (this.closest('axon-graph') as any)
    if (parentGraph?.edges && Array.isArray(parentGraph.edges)) {
      const targetPortId = `${this.id || 'qp'}:${portName}`
      return parentGraph.edges.some((edge: any) => edge.to === targetPortId || edge.toPort?.id === targetPortId)
    }
    return false
  }

  private attachInputListeners(inputElement: HTMLInputElement): void {
    const userInteractionEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
    for (const eventName of userInteractionEvents) {
      inputElement.addEventListener(eventName, (event) => event.stopPropagation())
    }

    const handleParameterUpdate = () => {
      const trimmedValue = inputElement.value.trim()
      const currentData = this.nodeData || (this.engine as any)?.data || {}
      currentData.paramName = trimmedValue
      ;(this as any)._nodeData = currentData
      if (this.engine) {
        ;(this.engine as any).data = currentData
      }

      const titleElement = this.querySelector('.node-title')
      if (titleElement) {
        titleElement.textContent = `?${trimmedValue || 'param'}`
      }

      const valuePortLabel = this.querySelector('axon-port-out[port-name="value"] .port-label')
      if (valuePortLabel) {
        valuePortLabel.textContent = `Value (?${trimmedValue || '...'})`
      }

      this.dispatchEvent(
        new CustomEvent('node-data-change', {
          detail: { id: this.id, data: currentData, paramName: trimmedValue },
          bubbles: true,
          composed: true,
        }),
      )
    }

    inputElement.addEventListener('change', handleParameterUpdate)
    inputElement.addEventListener('input', handleParameterUpdate)
  }

  /**
   * Renders the query parameter node with incremental DOM updates to preserve focus and wired state.
   */
  render(): void {
    const nodeState = this.nodeData || (this.engine as any)?.data || {}
    const parameterName: string = nodeState.paramName || 'page'
    const isWired: boolean = this.isPortWired('name')

    const existingCard = this.querySelector('.query-param-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== `?${parameterName}`) {
        titleElement.textContent = `?${parameterName}`
      }

      const valuePortLabel = existingCard.querySelector('axon-port-out[port-name="value"] .port-label')
      if (valuePortLabel && valuePortLabel.textContent !== `Value (?${parameterName})`) {
        valuePortLabel.textContent = `Value (?${parameterName})`
      }

      const parameterRow = existingCard.querySelector('.query-param-name-row')
      if (parameterRow) {
        parameterRow.classList.toggle('is-wired', isWired)
        const controlContainer = parameterRow.querySelector('.slot-control-container')
        if (controlContainer) {
          if (isWired) {
            if (!controlContainer.querySelector('.slot-bound-badge')) {
              controlContainer.innerHTML =
                '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
            }
          } else {
            let inputElement = controlContainer.querySelector<HTMLInputElement>('.query-param-input')
            if (!inputElement) {
              controlContainer.innerHTML = `
                <input
                  type="text"
                  class="slot-input query-param-input"
                  value="${parameterName}"
                  placeholder="e.g. page"
                  style="width: 100px;"
                />
              `
              inputElement = controlContainer.querySelector<HTMLInputElement>('.query-param-input')
              if (inputElement) this.attachInputListeners(inputElement)
            } else if (document.activeElement !== inputElement && inputElement.value !== parameterName) {
              inputElement.value = parameterName
            }
          }
        }
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card route-param-card query-param-card">
        <div class="data-node-header query-param-header">
          <span class="card-type-label">Query Param</span>
          <span class="card-id-label node-title">?${parameterName}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-input slot-item-row query-param-name-row ${isWired ? 'is-wired' : ''}">
            <axon-port-in
              id="${this.id || 'qp'}:name"
              port-name="name"
              data-type="string"
              class="port input"
            >
              <span class="port-label">name</span>
            </axon-port-in>
            <div class="node-row-control slot-control-container">
              ${
                isWired
                  ? '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
                  : `
                <input
                  type="text"
                  class="node-inline-input slot-input query-param-input"
                  value="${parameterName}"
                  placeholder="e.g. page"
                  style="width: 80px;"
                />
              `
              }
            </div>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'qp'}:value"
              port-name="value"
              data-type="string"
              class="port output"
            >
              <span class="port-label">Value (?${parameterName})</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `

    const inputElement = this.querySelector<HTMLInputElement>('.query-param-input')
    if (inputElement) {
      this.attachInputListeners(inputElement)
    }
  }
}
