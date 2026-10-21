import { AxonBaseNodeElement } from '../baseNodeElement.js'
import {
  type RouteParamNodeEngine,
  createRouteParamNode,
} from '../../../nodes/data/dataGraph.engine.js'
import { NODE_TYPES } from '../../../nodes/nodes.constants.js'

/**
 * Custom element representing a URL route path parameter (e.g., `:id`).
 * Exposes the parameter name, bound single value, and all parameters record.
 */
export class AxonRouteParamNode extends AxonBaseNodeElement<RouteParamNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): RouteParamNodeEngine {
    return createRouteParamNode(options)
  }

  connectedCallback(): void {
    this.axonNodeType = NODE_TYPES.ROUTE_PARAM
    this.setAttribute('data-node-type', NODE_TYPES.ROUTE_PARAM)
    this.classList.add('axon-route-param-node')
    super.connectedCallback()
  }

  /**
   * Renders the route parameter node with incremental DOM updates to preserve focus and port state.
   */
  render(): void {
    const nodeState = this.nodeData || (this.engine as any)?.data || {}
    const parameterName: string = nodeState.paramName || ''

    // Incremental DOM update: do not wipe innerHTML if input already exists
    const existingInputElement = this.querySelector<HTMLInputElement>('.route-param-input')
    if (existingInputElement) {
      const titleElement = this.querySelector('.node-title')
      if (titleElement) {
        titleElement.textContent = `:${parameterName || 'param'}`
      }
      const valuePortLabel = this.querySelector('axon-port-out[port-name="value"] .port-label')
      if (valuePortLabel) {
        valuePortLabel.textContent = `Value (${parameterName})`
      }
      if (document.activeElement !== existingInputElement && existingInputElement.value !== parameterName) {
        existingInputElement.value = parameterName
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card route-param-card">
        <div class="data-node-header route-param-header">
          <span class="card-type-label">Route Param</span>
          <span class="card-id-label node-title">:${parameterName || 'param'}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-input slot-item-row route-param-name-row">
            <span class="port-label" style="font-size: 11px;">param</span>
            <div class="node-row-control slot-control-container">
              <input
                type="text"
                class="node-inline-input slot-input route-param-input"
                value="${parameterName}"
                placeholder="e.g. id"
                style="width: 85px;"
              />
            </div>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'param'}:value"
              port-name="value"
              data-type="string"
              class="port output"
            >
              <span class="port-label">Value (${parameterName})</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'param'}:all"
              port-name="all"
              data-type="object"
              class="port output"
            >
              <span class="port-label">All Params ({})</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `

    const parameterInputElement = this.querySelector<HTMLInputElement>('.route-param-input')
    if (parameterInputElement) {
      const userInteractionEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
      for (const eventName of userInteractionEvents) {
        parameterInputElement.addEventListener(eventName, (event) => event.stopPropagation())
      }

      const handleParameterNameChange = () => {
        const trimmedValue = parameterInputElement.value.trim()
        const currentData = this.nodeData || (this.engine as any)?.data || {}
        currentData.paramName = trimmedValue
        ;(this as any)._nodeData = currentData
        if (this.engine) {
          ;(this.engine as any).data = currentData
        }

        const titleElement = this.querySelector('.node-title')
        if (titleElement) {
          titleElement.textContent = `:${trimmedValue || 'param'}`
        }
        const valuePortLabel = this.querySelector('axon-port-out[port-name="value"] .port-label')
        if (valuePortLabel) {
          valuePortLabel.textContent = `Value (${trimmedValue})`
        }

        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            detail: { id: this.id, data: currentData, paramName: trimmedValue },
            bubbles: true,
            composed: true,
          }),
        )
      }

      parameterInputElement.addEventListener('input', handleParameterNameChange)
      parameterInputElement.addEventListener('change', handleParameterNameChange)
    }
  }
}
