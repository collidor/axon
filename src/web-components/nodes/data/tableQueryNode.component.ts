// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createTableQueryNode,
  TableQueryNodeEngine,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Database Table Query Node.
 * Provides live querying, pagination, and filtering controls over a database table.
 */
export class AxonTableQueryNode extends AxonBaseNodeElement<TableQueryNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): TableQueryNodeEngine {
    return createTableQueryNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.TABLE_QUERY
    this.setAttribute('data-node-type', NODE_TYPES.TABLE_QUERY)
    this.classList.add('axon-table-query-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const tableName = nodeConfiguration.tableName || ''
    const filterField = nodeConfiguration.filterField || 'id'
    const availableTables: string[] = nodeConfiguration.availableTables || []

    // Incremental DOM update: preserve port elements and update select value and title
    const existingCard = this.querySelector('.table-query-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== (tableName || this.id || '(unbound)')) {
        titleElement.textContent = tableName || this.id || '(unbound)'
      }
      const tableSelect = existingCard.querySelector<HTMLSelectElement>('.axon-table-select')
      if (tableSelect && document.activeElement !== tableSelect && tableSelect.value !== tableName) {
        tableSelect.value = tableName
      }
      return
    }

    const tableSelectHtml =
      availableTables.length > 0
        ? `
        <div class="node-control-row">
          <label class="node-control-label">Table:</label>
          <ui-select class="node-inline-select axon-table-select" size="sm" value="${tableName}" title="Choose table to query">
            ${availableTables
              .map(
                (tbl) => `<option value="${tbl}" ${tbl === tableName ? 'selected' : ''}>🗄️ ${tbl}</option>`,
              )
              .join('')}
          </ui-select>
        </div>`
        : ''

    this.innerHTML = `
      <div class="data-node-card table-query-card">
        <div class="data-node-header table-query-header">
          <span class="card-type-label">Table Query</span>
          <span class="card-id-label node-title">${tableName || this.id || '(unbound)'}</span>
        </div>
        <div class="data-node-body">
          ${tableSelectHtml}
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'query'}:filterValue"
              port-name="filterValue"
              data-type="string"
              class="port input"
            >
              <span class="port-label">Filter (${filterField})</span>
            </axon-port-in>
            <axon-port-out
              id="${this.id || 'query'}:records"
              port-name="records"
              data-type="array"
              class="port output"
            >
              <span class="port-label">Records ([])</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'query'}:page"
              port-name="page"
              data-type="number"
              class="port input"
            >
              <span class="port-label">Page (#)</span>
            </axon-port-in>
            <axon-port-out
              id="${this.id || 'query'}:first"
              port-name="first"
              data-type="object"
              class="port output"
            >
              <span class="port-label">First Record ({})</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'query'}:pageSize"
              port-name="pageSize"
              data-type="number"
              class="port input"
            >
              <span class="port-label">Page Size (#)</span>
            </axon-port-in>
            <axon-port-out
              id="${this.id || 'query'}:count"
              port-name="count"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Count (#)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'query'}:total"
              port-name="total"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Total (#)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'query'}:totalPages"
              port-name="totalPages"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Total Pages (#)</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `

    const selectElement = this.querySelector('.axon-table-select') as any
    if (selectElement) {
      const stopPropagationHandler = (pointerEvent: Event) => pointerEvent.stopPropagation()
      selectElement.addEventListener('pointerdown', stopPropagationHandler)
      selectElement.addEventListener('mousedown', stopPropagationHandler)
      selectElement.addEventListener('click', stopPropagationHandler)

      const onTableChange = (changeEvent: Event) => {
        changeEvent.stopPropagation()
        const newTableName = (changeEvent as CustomEvent).detail?.value ?? selectElement.value
        const patchData = { tableName: newTableName }
        this.nodeData = { ...this.nodeData, ...patchData }
        if (this.engine) {
          ;(this.engine as any).data = { ...(this.engine as any).data, ...patchData }
        }
        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            bubbles: true,
            composed: true,
            detail: { id: this.id, data: patchData },
          }),
        )
        this.render()
      }

      selectElement.addEventListener('change', onTableChange)
      selectElement.addEventListener('ui-select-change', onTableChange)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_TABLE_QUERY_NODE)) {
  customElements.define(TAG_NAMES.AXON_TABLE_QUERY_NODE, AxonTableQueryNode)
}
