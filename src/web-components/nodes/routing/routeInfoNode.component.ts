import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  type RouteInfoNodeEngine,
  createRouteInfoNode,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'

/**
 * Custom element representing static and active route routing metadata
 * (e.g., path pattern, full active path, and route identifier/name).
 */
export class AxonRouteInfoNode extends AxonBaseNodeElement<RouteInfoNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): RouteInfoNodeEngine {
    return createRouteInfoNode(options)
  }

  connectedCallback(): void {
    this.axonNodeType = NODE_TYPES.ROUTE_INFO
    this.setAttribute('data-node-type', NODE_TYPES.ROUTE_INFO)
    this.classList.add('axon-route-info-node')
    super.connectedCallback()
  }

  /**
   * Renders the route info node with incremental updates.
   */
  render(): void {
    const nodeState = this.nodeData || (this.engine as any)?.data || {}
    const routePatternPath: string = nodeState.routePath || '/...'
    const routeIdentifierName: string = nodeState.routeName || 'Route'

    const existingCard = this.querySelector('.route-info-header')
    if (existingCard) {
      const titleElement = this.querySelector('.node-title')
      if (titleElement) titleElement.textContent = routeIdentifierName
      return
    }

    this.innerHTML = `
      <div class="data-node-card route-param-card">
        <div class="data-node-header route-info-header">
          <span class="card-type-label">Route Info</span>
          <span class="card-id-label node-title">${routeIdentifierName}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'rinfo'}:path"
              port-name="path"
              data-type="string"
              class="port output"
            >
              <span class="port-label">Pattern (${routePatternPath})</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'rinfo'}:fullPath"
              port-name="fullPath"
              data-type="string"
              class="port output"
            >
              <span class="port-label">Active Path (fullPath)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'rinfo'}:name"
              port-name="name"
              data-type="string"
              class="port output"
            >
              <span class="port-label">Route Name (${routeIdentifierName})</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `
  }
}
