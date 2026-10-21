// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createArrayTransformNode,
  ArrayTransformNodeEngine,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing an Array Transform Node.
 * Performs collection operations including filter, pluck (map), sort, and aggregate (sum/count/min/max).
 */
export class AxonArrayTransformNode extends AxonBaseNodeElement<ArrayTransformNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): ArrayTransformNodeEngine {
    return createArrayTransformNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.ARRAY_TRANSFORM
    this.setAttribute('data-node-type', NODE_TYPES.ARRAY_TRANSFORM)
    this.classList.add('axon-array-transform-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const transformOperation = (nodeConfiguration.operation || 'filter').toLowerCase()
    const targetField = nodeConfiguration.field || nodeConfiguration.sortKey || ''

    let portsHtml = ''
    let title = targetField || transformOperation.toUpperCase()
    let badgeText = `Array ${transformOperation.toUpperCase()}`

    if (transformOperation === 'filter') {
      badgeText = 'Array Filter'
      portsHtml = `
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'arr'}:array" port-name="array" data-type="array" class="port input">
            <span class="port-label">Input Array ([])</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'arr'}:result" port-name="result" data-type="array" class="port output">
            <span class="port-label">Filtered ([])</span>
          </axon-port-out>
        </div>
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'arr'}:targetValue" port-name="targetValue" data-type="any" class="port input">
            <span class="port-label">Target Value</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'arr'}:count" port-name="count" data-type="number" class="port output">
            <span class="port-label">Count (#)</span>
          </axon-port-out>
        </div>
      `
    } else if (transformOperation === 'map' || transformOperation === 'pluck') {
      badgeText = 'Array Pluck'
      title = `.${targetField}`
      portsHtml = `
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'arr'}:array" port-name="array" data-type="array" class="port input">
            <span class="port-label">Input Array ([])</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'arr'}:result" port-name="result" data-type="array" class="port output">
            <span class="port-label">Plucked ([])</span>
          </axon-port-out>
        </div>
        <div class="data-node-row port-row-pair">
          <span></span>
          <axon-port-out id="${this.id || 'arr'}:value" port-name="value" data-type="primitive" class="port output">
            <span class="port-label">First Value</span>
          </axon-port-out>
        </div>
      `
    } else if (transformOperation === 'sort') {
      badgeText = 'Array Sort'
      portsHtml = `
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'arr'}:array" port-name="array" data-type="array" class="port input">
            <span class="port-label">Input Array ([])</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'arr'}:result" port-name="result" data-type="array" class="port output">
            <span class="port-label">Sorted ([])</span>
          </axon-port-out>
        </div>
        <div class="data-node-row port-row-pair">
          <span></span>
          <axon-port-out id="${this.id || 'arr'}:first" port-name="first" data-type="object" class="port output">
            <span class="port-label">First Record ({})</span>
          </axon-port-out>
        </div>
      `
    } else {
      badgeText = 'Array Agg'
      portsHtml = `
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'arr'}:array" port-name="array" data-type="array" class="port input">
            <span class="port-label">Input Array ([])</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'arr'}:result" port-name="result" data-type="number" class="port output">
            <span class="port-label">Agg Result (#)</span>
          </axon-port-out>
        </div>
      `
    }

    // Incremental DOM update: If operation didn't change, update fields without rebuilding port hierarchy
    const existingCard = this.querySelector('.array-transform-card')
    if (existingCard && (existingCard as any).dataset?.op === transformOperation) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement) titleElement.textContent = title
      const fieldInput = existingCard.querySelector<HTMLInputElement>('.array-field-input')
      if (fieldInput && document.activeElement !== fieldInput && fieldInput.value !== targetField) {
        fieldInput.value = targetField
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card array-transform-card" data-op="${transformOperation}">
        <div class="data-node-header array-transform-header">
          <span class="card-type-label">${badgeText}</span>
          <span class="card-id-label node-title">${title}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-input slot-item-row" style="gap: 6px;">
            <span class="port-label" style="font-size: 10px;">Op</span>
            <ui-select class="node-inline-select array-op-select" size="sm" value="${transformOperation}" style="width: 90px;">
              <option value="filter" ${transformOperation === 'filter' ? 'selected' : ''}>filter</option>
              <option value="pluck" ${transformOperation === 'pluck' || transformOperation === 'map' ? 'selected' : ''}>pluck</option>
              <option value="sort" ${transformOperation === 'sort' ? 'selected' : ''}>sort</option>
              <option value="agg" ${transformOperation === 'agg' ? 'selected' : ''}>agg</option>
            </ui-select>
          </div>
          <div class="data-node-row port-row-input slot-item-row" style="gap: 6px;">
            <span class="port-label" style="font-size: 10px;">Field</span>
            <input
              type="text"
              class="node-inline-input array-field-input"
              value="${targetField}"
              placeholder="field name"
              style="width: 90px;"
            />
          </div>
          ${portsHtml}
        </div>
      </div>
    `

    const stopEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
    const operationSelect = this.querySelector<HTMLElement>('.array-op-select')
    const fieldInput = this.querySelector<HTMLInputElement>('.array-field-input')
    for (const element of [operationSelect, fieldInput]) {
      if (!element) continue
      for (const eventName of stopEvents) {
        element.addEventListener(eventName, (event) => event.stopPropagation())
      }
    }
    if (operationSelect) {
      const onOperationChange = () => {
        const nextOperation = ((operationSelect as any).value || 'filter').toLowerCase()
        const currentConfiguration = this.nodeData || (this.engine as any)?.data || {}
        currentConfiguration.operation = nextOperation
        ;(this as any)._nodeData = currentConfiguration
        if (this.engine) {
          ;(this.engine as any).data = currentConfiguration
        }
        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            detail: { id: this.id, data: currentConfiguration, operation: nextOperation },
            bubbles: true,
            composed: true,
          }),
        )
        this.render()
      }
      operationSelect.addEventListener('change', onOperationChange)
      operationSelect.addEventListener('ui-select-change', onOperationChange)
    }
    if (fieldInput) {
      const onFieldChange = () => {
        const nextField = fieldInput.value.trim()
        const currentConfiguration = this.nodeData || (this.engine as any)?.data || {}
        currentConfiguration.field = nextField
        ;(this as any)._nodeData = currentConfiguration
        if (this.engine) {
          ;(this.engine as any).data = currentConfiguration
        }
        const titleElement = this.querySelector('.node-title')
        if (titleElement) {
          titleElement.textContent =
            transformOperation === 'map' || transformOperation === 'pluck'
              ? `.${nextField}`
              : nextField || transformOperation.toUpperCase()
        }
        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            detail: { id: this.id, data: currentConfiguration, field: nextField },
            bubbles: true,
            composed: true,
          }),
        )
      }
      fieldInput.addEventListener('input', onFieldChange)
      fieldInput.addEventListener('change', onFieldChange)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_ARRAY_TRANSFORM_NODE)) {
  customElements.define(TAG_NAMES.AXON_ARRAY_TRANSFORM_NODE, AxonArrayTransformNode)
}
