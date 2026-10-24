import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  type RouteScopeNodeEngine,
  createRouteScopeNode,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'

/**
 * Custom element representing a route scope binder, taking structured inputs and binding them
 * into a unified route scope state record.
 */
export class AxonRouteScopeNode extends AxonBaseNodeElement<RouteScopeNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): RouteScopeNodeEngine {
    return createRouteScopeNode(options)
  }

  connectedCallback(): void {
    this.axonNodeType = NODE_TYPES.ROUTE_SCOPE
    this.setAttribute('data-node-type', NODE_TYPES.ROUTE_SCOPE)
    this.classList.add('axon-route-scope-node')
    super.connectedCallback()
  }

  /**
   * Renders incoming scope field ports and the unified output scope state port.
   */
  render(): void {
    const nodeState = this.nodeData || (this.engine as any)?.data || {}
    const scopeTitle: string = nodeState.scopeName || 'Route Scope Binder'
    const schemaFields: Array<{ name: string; type: string }> = Array.isArray(nodeState.fields)
      ? nodeState.fields
      : []

    const portsMarkup = schemaFields
      .map((field) => {
        const typeLabel =
          field.type === 'array' || field.type === 'list'
            ? 'Array&lt;Struct&gt;'
            : field.type === 'struct' || field.type === 'object'
              ? 'struct'
              : field.type === 'primitive'
                ? 'primitive'
                : field.type || 'any'
        const tagClass = field.type === 'list' ? 'array' : field.type || 'struct'
        return `
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'scope'}:${field.name}" port-name="${field.name}" data-type="${field.type || 'struct'}" class="port input">
              <span class="port-label">${field.name} <span class="port-type-tag ${tagClass}">(${typeLabel})</span></span>
            </axon-port-in>
            <span></span>
          </div>
        `
      })
      .join('')

    this.innerHTML = `
      <div class="data-node-card route-scope-card">
        <div class="data-node-header route-scope-header">
          <span class="card-type-label">Output Scope</span>
          <span class="card-id-label node-title">${scopeTitle}</span>
        </div>
        <div class="data-node-body">
          ${portsMarkup}
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out id="${this.id || 'scope'}:scope" port-name="scope" data-type="struct" class="port output">
              <span class="port-label">Scope State</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `
  }
}
