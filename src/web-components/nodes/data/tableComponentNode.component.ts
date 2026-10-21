// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createTableComponentNode,
  TableComponentNodeEngine,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Table Component Node.
 * Bridges a data table UI widget with data graph inputs (records, pagination, sorting)
 * and outputs user click/selection/page event signals.
 */
export class AxonTableComponentNode extends AxonBaseNodeElement<TableComponentNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): TableComponentNodeEngine {
    return createTableComponentNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.TABLE_COMPONENT
    this.setAttribute('data-node-type', NODE_TYPES.TABLE_COMPONENT)
    this.classList.add('axon-table-component-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const title = nodeConfiguration.title || 'Table Component'

    // Incremental DOM update: preserve ports and update title if existing
    const existingCard = this.querySelector('.table-component-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== title) {
        titleElement.textContent = title
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card table-component-card">
        <div class="data-node-header table-component-header">
          <span class="node-icon">📊</span>
          <div class="node-title-group">
            <span class="node-badge">Component Node</span>
            <strong class="node-title">${title}</strong>
          </div>
        </div>
        <div class="data-node-body">
          <div class="ports-category-tag">📥 Input Slots</div>
          <div class="slot-item-row" data-slot-row="data">
            <axon-port-in id="${this.id || 'table'}:data" port-name="data" data-type="array" class="port input">
              <span class="port-label">Data Records ([])</span>
            </axon-port-in>
          </div>
          <div class="slot-item-row" data-slot-row="page">
            <axon-port-in id="${this.id || 'table'}:page" port-name="page" data-type="number" class="port input">
              <span class="port-label">Page (#)</span>
            </axon-port-in>
          </div>
          <div class="slot-item-row" data-slot-row="pageSize">
            <axon-port-in id="${this.id || 'table'}:pageSize" port-name="pageSize" data-type="number" class="port input">
              <span class="port-label">Page Size (#)</span>
            </axon-port-in>
          </div>
          <div class="slot-item-row" data-slot-row="visible">
            <axon-port-in id="${this.id || 'table'}:visible" port-name="visible" data-type="boolean" class="port input">
              <span class="port-label">Visible (bool)</span>
            </axon-port-in>
          </div>
          <div class="slot-item-row" data-slot-row="disabled">
            <axon-port-in id="${this.id || 'table'}:disabled" port-name="disabled" data-type="boolean" class="port input">
              <span class="port-label">Disabled (bool)</span>
            </axon-port-in>
          </div>

          <div class="ports-category-tag">⚡ Event Trigger Outputs</div>
          <div class="slot-item-row" data-slot-row="nextPage">
            <axon-port-out id="${this.id || 'table'}:nextPage" port-name="nextPage" data-type="boolean" class="port output">
              <span class="port-label">Next Page (trigger)</span>
            </axon-port-out>
          </div>
          <div class="slot-item-row" data-slot-row="prevPage">
            <axon-port-out id="${this.id || 'table'}:prevPage" port-name="prevPage" data-type="boolean" class="port output">
              <span class="port-label">Prev Page (trigger)</span>
            </axon-port-out>
          </div>
          <div class="slot-item-row" data-slot-row="pageChange">
            <axon-port-out id="${this.id || 'table'}:pageChange" port-name="pageChange" data-type="boolean" class="port output">
              <span class="port-label">Page Change (trigger)</span>
            </axon-port-out>
          </div>
          <div class="slot-item-row" data-slot-row="pageOut">
            <axon-port-out id="${this.id || 'table'}:page" port-name="page" data-type="number" class="port output">
              <span class="port-label">Page (#)</span>
            </axon-port-out>
          </div>
          <div class="slot-item-row" data-slot-row="sort">
            <axon-port-out id="${this.id || 'table'}:sort" port-name="sort" data-type="boolean" class="port output">
              <span class="port-label">Sort (trigger)</span>
            </axon-port-out>
          </div>
          <div class="slot-item-row" data-slot-row="rowClick">
            <axon-port-out id="${this.id || 'table'}:rowClick" port-name="rowClick" data-type="boolean" class="port output">
              <span class="port-label">Row Click (trigger)</span>
            </axon-port-out>
          </div>
          <div class="slot-item-row" data-slot-row="rowOut">
            <axon-port-out id="${this.id || 'table'}:row" port-name="row" data-type="object" class="port output">
              <span class="port-label">Clicked Row ({})</span>
            </axon-port-out>
          </div>
          <div class="slot-item-row" data-slot-row="selectionChange">
            <axon-port-out id="${this.id || 'table'}:selectionChange" port-name="selectionChange" data-type="boolean" class="port output">
              <span class="port-label">Selection (trigger)</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_TABLE_COMPONENT_NODE)) {
  customElements.define(TAG_NAMES.AXON_TABLE_COMPONENT_NODE, AxonTableComponentNode)
}
