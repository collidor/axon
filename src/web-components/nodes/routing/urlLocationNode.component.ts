import { AxonBaseNodeElement } from '../baseNodeElement.js'
import {
  type UrlLocationNodeEngine,
  createUrlLocationNode,
} from '../../../nodes/data/dataGraph.engine.js'
import { NODE_TYPES } from '../../../nodes/nodes.constants.js'

/**
 * Custom element representing browser window.location reactive properties
 * (pathname, search, hash, origin, and full href).
 */
export class AxonUrlLocationNode extends AxonBaseNodeElement<UrlLocationNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): UrlLocationNodeEngine {
    return createUrlLocationNode(options)
  }

  connectedCallback(): void {
    this.axonNodeType = NODE_TYPES.URL_LOCATION
    this.setAttribute('data-node-type', NODE_TYPES.URL_LOCATION)
    this.classList.add('axon-url-location-node')
    super.connectedCallback()
  }

  /**
   * Renders browser URL location outputs.
   */
  render(): void {
    const existingCard = this.querySelector('.url-location-header')
    if (existingCard) return

    this.innerHTML = `
      <div class="data-node-card route-param-card">
        <div class="data-node-header url-location-header">
          <span class="card-type-label">URL Location</span>
          <span class="card-id-label node-title">${this.id || 'Browser URL'}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'loc'}:pathname"
              port-name="pathname"
              data-type="string"
              class="port output"
            >
              <span class="port-label">pathname</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'loc'}:search"
              port-name="search"
              data-type="string"
              class="port output"
            >
              <span class="port-label">search (?query)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'loc'}:hash"
              port-name="hash"
              data-type="string"
              class="port output"
            >
              <span class="port-label">hash (#anchor)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'loc'}:origin"
              port-name="origin"
              data-type="string"
              class="port output"
            >
              <span class="port-label">origin</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'loc'}:href"
              port-name="href"
              data-type="string"
              class="port output"
            >
              <span class="port-label">href (full url)</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `
  }
}
