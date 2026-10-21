// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import { createChangePageNode, ChangePageNodeEngine } from '../../../nodes/routing/router.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Change Page Node.
 * Increments, decrements, or sets the absolute pagination state
 * on the current active route or router adapter when triggered.
 */
export class AxonChangePageNode extends AxonBaseNodeElement<ChangePageNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): ChangePageNodeEngine {
    return createChangePageNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.CHANGE_PAGE
    this.setAttribute('data-node-type', NODE_TYPES.CHANGE_PAGE)
    this.classList.add('axon-change-page-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const parameterName = nodeConfiguration.paramName || 'page'
    const stepDelta = nodeConfiguration.delta !== undefined && nodeConfiguration.delta !== null ? nodeConfiguration.delta : 1
    const pageSize = nodeConfiguration.pageSize !== undefined && nodeConfiguration.pageSize !== null ? nodeConfiguration.pageSize : 20

    // Incremental DOM update: If the card already exists, update inputs without destroying ports
    const existingCard = this.querySelector('.change-page-card')
    if (existingCard) {
      const deltaInput = existingCard.querySelector<HTMLInputElement>('.axon-delta-input')
      if (deltaInput && document.activeElement !== deltaInput && deltaInput.value !== String(stepDelta)) {
        deltaInput.value = String(stepDelta)
      }
      const paramInput = existingCard.querySelector<HTMLInputElement>('.axon-param-input')
      if (paramInput && document.activeElement !== paramInput && paramInput.value !== parameterName) {
        paramInput.value = parameterName
      }
      const pageSizeInput = existingCard.querySelector<HTMLInputElement>('.axon-pagesize-input')
      if (pageSizeInput && document.activeElement !== pageSizeInput && pageSizeInput.value !== String(pageSize)) {
        pageSizeInput.value = String(pageSize)
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card change-page-card">
        <div class="data-node-header change-page-header">
          <div class="node-title-group">
            <span class="node-badge nav-badge">PAGE NAV</span>
            <strong class="node-title">Change Page</strong>
          </div>
          <span class="node-icon">📄</span>
        </div>
        <div class="data-node-body">
          <div class="node-control-row">
            <label class="node-control-label">Param Name:</label>
            <input
              type="text"
              class="node-inline-input axon-param-input"
              value="${parameterName}"
              placeholder="page"
              title="Query/route parameter name for pagination"
            />
          </div>
          <div class="node-control-row">
            <label class="node-control-label">Delta:</label>
            <input
              type="number"
              step="1"
              class="node-inline-input axon-delta-input"
              value="${stepDelta}"
              placeholder="1"
              title="Step delta (e.g. +1 for Next, -1 for Prev)"
            />
          </div>
          <div class="node-control-row">
            <label class="node-control-label">Page Size:</label>
            <input
              type="number"
              step="1"
              class="node-inline-input axon-pagesize-input"
              value="${pageSize}"
              placeholder="20"
              title="Items per page"
            />
          </div>

          <div class="ports-category-tag">⚡ Flow In</div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'page'}:trigger"
              port-name="trigger"
              data-type="boolean"
              class="port input flow-port"
            >
              <span class="port-label">▶ Exec (trigger)</span>
            </axon-port-in>
            <span></span>
          </div>

          <div class="ports-category-tag">📥 Overrides (Optional)</div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'page'}:page"
              port-name="page"
              data-type="number"
              class="port input"
            >
              <span class="port-label">Absolute Page (#)</span>
            </axon-port-in>
            <span></span>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'page'}:totalRecords"
              port-name="totalRecords"
              data-type="number"
              class="port input"
            >
              <span class="port-label">Total Records (#)</span>
            </axon-port-in>
            <span></span>
          </div>

          <div class="ports-category-tag">📊 Flow & Info Out</div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'page'}:out"
              port-name="out"
              data-type="boolean"
              class="port output flow-port"
            >
              <span class="port-label">▶ Done (out)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'page'}:currentPage"
              port-name="currentPage"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Current Page (#)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'page'}:totalPages"
              port-name="totalPages"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Total Pages (#)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'page'}:offset"
              port-name="offset"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Record Offset (#)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'page'}:limit"
              port-name="limit"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Limit / Page Size (#)</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `

    const stopPropagationHandler = (pointerEvent: Event) => pointerEvent.stopPropagation()

    const paramInput = this.querySelector<HTMLInputElement>('.axon-param-input')
    if (paramInput) {
      paramInput.addEventListener('pointerdown', stopPropagationHandler)
      paramInput.addEventListener('mousedown', stopPropagationHandler)
      paramInput.addEventListener('click', stopPropagationHandler)
      paramInput.addEventListener('change', (changeEvent) => {
        changeEvent.stopPropagation()
        const patchData = { paramName: paramInput.value.trim() || 'page' }
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
      })
    }

    const deltaInput = this.querySelector<HTMLInputElement>('.axon-delta-input')
    if (deltaInput) {
      deltaInput.addEventListener('pointerdown', stopPropagationHandler)
      deltaInput.addEventListener('mousedown', stopPropagationHandler)
      deltaInput.addEventListener('click', stopPropagationHandler)
      deltaInput.addEventListener('change', (changeEvent) => {
        changeEvent.stopPropagation()
        const patchData = { delta: Number(deltaInput.value) || 1 }
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
      })
    }

    const pageSizeInput = this.querySelector<HTMLInputElement>('.axon-pagesize-input')
    if (pageSizeInput) {
      pageSizeInput.addEventListener('pointerdown', stopPropagationHandler)
      pageSizeInput.addEventListener('mousedown', stopPropagationHandler)
      pageSizeInput.addEventListener('click', stopPropagationHandler)
      pageSizeInput.addEventListener('change', (changeEvent) => {
        changeEvent.stopPropagation()
        const patchData = { pageSize: Number(pageSizeInput.value) || 20 }
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
      })
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_CHANGE_PAGE_NODE)) {
  customElements.define(TAG_NAMES.AXON_CHANGE_PAGE_NODE, AxonChangePageNode)
}
