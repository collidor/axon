import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  type QueryParamsNodeEngine,
  createQueryParamsNode,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'

/**
 * Custom element representing all URL query parameters as a consolidated dictionary/record object.
 */
export class AxonQueryParamsNode extends AxonBaseNodeElement<QueryParamsNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): QueryParamsNodeEngine {
    return createQueryParamsNode(options)
  }

  connectedCallback(): void {
    this.axonNodeType = NODE_TYPES.QUERY_PARAMS
    this.setAttribute('data-node-type', NODE_TYPES.QUERY_PARAMS)
    this.classList.add('axon-query-params-node')
    super.connectedCallback()
  }

  /**
   * Renders the query parameters dictionary node.
   */
  render(): void {
    const existingCard = this.querySelector('.query-params-header')
    if (existingCard) return

    this.innerHTML = `
      <div class="data-node-card route-param-card">
        <div class="data-node-header query-params-header">
          <span class="card-type-label">Query Params</span>
          <span class="card-id-label node-title">All Query Params</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'qps'}:queryParams"
              port-name="queryParams"
              data-type="object"
              class="port output"
            >
              <span class="port-label">queryParams ({})</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `
  }
}
