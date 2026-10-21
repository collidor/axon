// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from './baseNodeElement'
import { createDbPutNode, DbPutNodeEngine } from '../../nodes/dbPut.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import { TAG_NAMES } from '../constants'

export class AxonDbPutNode extends AxonBaseNodeElement<DbPutNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): DbPutNodeEngine {
    return createDbPutNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.DB_PUT
    this.setAttribute('data-node-type', NODE_TYPES.DB_PUT)
    this.classList.add('axon-db-put-node')
    super.connectedCallback()
  }

  render() {
    const data = this.nodeData || (this.engine as any)?.data || {}
    const tableName = data.tableName || data.storeName || 'characters'

    const existingInput = this.querySelector<HTMLInputElement>('.db-put-table-input')
    if (existingInput) {
      const titleEl = this.querySelector('.node-title')
      if (titleEl && titleEl.textContent !== tableName) {
        titleEl.textContent = tableName
      }
      if (document.activeElement !== existingInput && existingInput.value !== tableName) {
        existingInput.value = tableName
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card db-put-card">
        <div class="data-node-header db-put-header">
          <span class="node-icon">💾</span>
          <div class="node-title-group">
            <span class="node-badge">DB Put / Upsert</span>
            <strong class="node-title">${tableName}</strong>
          </div>
        </div>
        <div class="data-node-body">
          <div class="data-node-row" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 8px;">
            <span class="port-label" style="font-size: 11px;">Store / Table</span>
            <input
              type="text"
              class="node-inline-input db-put-table-input"
              value="${tableName}"
              placeholder="characters"
              style="width: 110px;"
            />
          </div>
          <div class="ports-category-tag">⚡ Flow In</div>
          <axon-port-in
            id="${this.id || 'db_put'}:in"
            port-name="in"
            data-type="flow"
            class="port input flow-port"
          >
            <span class="port-label">▶ Exec (in)</span>
          </axon-port-in>
          
          <div class="ports-category-tag">📦 Record Data</div>
          <axon-port-in
            id="${this.id || 'db_put'}:record"
            port-name="record"
            data-type="object"
            class="port input"
          >
            <span class="port-label">Record ({})</span>
          </axon-port-in>
          <axon-port-in
            id="${this.id || 'db_put'}:id"
            port-name="id"
            data-type="string"
            class="port input"
          >
            <span class="port-label">Record ID (opt)</span>
          </axon-port-in>
          <axon-port-in
            id="${this.id || 'db_put'}:draftId"
            port-name="draftId"
            data-type="string"
            class="port input"
          >
            <span class="port-label">Draft ID (opt)</span>
          </axon-port-in>

          <div class="ports-category-tag">📊 Status & Progress</div>
          <axon-port-out
            id="${this.id || 'db_put'}:status"
            port-name="status"
            data-type="string"
            class="port output"
          >
            <span class="port-label">Status</span>
          </axon-port-out>
          <axon-port-out
            id="${this.id || 'db_put'}:progress"
            port-name="progress"
            data-type="number"
            class="port output"
          >
            <span class="port-label">Progress (%)</span>
          </axon-port-out>
          <axon-port-out
            id="${this.id || 'db_put'}:result"
            port-name="result"
            data-type="object"
            class="port output"
          >
            <span class="port-label">Saved Record</span>
          </axon-port-out>
          <axon-port-out
            id="${this.id || 'db_put'}:error"
            port-name="error"
            data-type="string"
            class="port output"
          >
            <span class="port-label">Error</span>
          </axon-port-out>

          <div class="ports-category-tag">⚡ Flow Pins</div>
          <axon-port-out
            id="${this.id || 'db_put'}:onSuccess"
            port-name="onSuccess"
            data-type="flow"
            class="port output flow-port"
          >
            <span class="port-label">▶ On Success</span>
          </axon-port-out>
          <axon-port-out
            id="${this.id || 'db_put'}:onError"
            port-name="onError"
            data-type="flow"
            class="port output flow-port"
          >
            <span class="port-label">▶ On Error</span>
          </axon-port-out>
          <axon-port-out
            id="${this.id || 'db_put'}:onProgress"
            port-name="onProgress"
            data-type="flow"
            class="port output flow-port"
          >
            <span class="port-label">▶ On Progress</span>
          </axon-port-out>
          <axon-port-out
            id="${this.id || 'db_put'}:finally"
            port-name="finally"
            data-type="flow"
            class="port output flow-port"
          >
            <span class="port-label">▶ Finally</span>
          </axon-port-out>
        </div>
      </div>
    `

    const tableInput = this.querySelector<HTMLInputElement>('.db-put-table-input')
    if (tableInput) {
      const stopEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
      for (const evt of stopEvents) {
        tableInput.addEventListener(evt, (e) => e.stopPropagation())
      }
      const onTableChange = () => {
        const nextVal = tableInput.value.trim() || 'characters'
        const currData = this.nodeData || (this.engine as any)?.data || {}
        currData.tableName = nextVal
        currData.storeName = nextVal
        ;(this as any)._nodeData = currData
        if (this.engine) {
          ;(this.engine as any).data = currData
        }
        const titleEl = this.querySelector('.node-title')
        if (titleEl) titleEl.textContent = nextVal
        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            detail: { id: this.id, data: currData, tableName: nextVal },
            bubbles: true,
            composed: true,
          }),
        )
      }
      tableInput.addEventListener('input', onTableChange)
      tableInput.addEventListener('change', onTableChange)
    }
  }
}

if (typeof customElements !== 'undefined') {
  if (!customElements.get(TAG_NAMES.AXON_DB_PUT_NODE)) {
    customElements.define(TAG_NAMES.AXON_DB_PUT_NODE, AxonDbPutNode)
  }
}
