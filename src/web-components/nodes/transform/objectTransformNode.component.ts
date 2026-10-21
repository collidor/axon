// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createObjectTransformNode,
  ObjectTransformNodeEngine,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing an Object Transform Node.
 * Performs object manipulations:
 * - 'pluck': extracts a single field value
 * - 'merge': combines two objects into one
 * - 'pick': picks specified keys into a new record
 */
export class AxonObjectTransformNode extends AxonBaseNodeElement<ObjectTransformNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): ObjectTransformNodeEngine {
    return createObjectTransformNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.OBJECT_TRANSFORM
    this.setAttribute('data-node-type', NODE_TYPES.OBJECT_TRANSFORM)
    this.classList.add('axon-object-transform-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const transformOperation = (nodeConfiguration.operation || 'pluck').toLowerCase()
    const targetField = nodeConfiguration.field || ''

    let portsHtml = ''
    let title = 'Object Transform'
    let badgeText = 'Object Transform'

    if (transformOperation === 'pluck') {
      badgeText = 'Object Pluck'
      title = targetField ? `.${targetField}` : 'Pluck Field'
      portsHtml = `
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'obj'}:object" port-name="object" data-type="object" class="port input">
            <span class="port-label">Source Object ({})</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'obj'}:value" port-name="value" data-type="primitive" class="port output">
            <span class="port-label">.${targetField}</span>
          </axon-port-out>
        </div>
      `
    } else if (transformOperation === 'merge') {
      badgeText = 'Object Merge'
      title = 'Merge Objects'
      portsHtml = `
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'obj'}:a" port-name="a" data-type="object" class="port input">
            <span class="port-label">Object A ({})</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'obj'}:result" port-name="result" data-type="object" class="port output">
            <span class="port-label">Merged ({})</span>
          </axon-port-out>
        </div>
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'obj'}:b" port-name="b" data-type="object" class="port input">
            <span class="port-label">Object B ({})</span>
          </axon-port-in>
          <span></span>
        </div>
      `
    } else {
      badgeText = 'Object Pick'
      title = 'Pick Fields'
      portsHtml = `
        <div class="data-node-row port-row-pair">
          <axon-port-in id="${this.id || 'obj'}:object" port-name="object" data-type="object" class="port input">
            <span class="port-label">Source Object ({})</span>
          </axon-port-in>
          <axon-port-out id="${this.id || 'obj'}:result" port-name="result" data-type="object" class="port output">
            <span class="port-label">Picked ({})</span>
          </axon-port-out>
        </div>
      `
    }

    // Incremental DOM update: If operation didn't change, update fields without rebuilding port hierarchy
    const existingCard = this.querySelector('.object-transform-card')
    if (existingCard && (existingCard as any).dataset?.op === transformOperation) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement) titleElement.textContent = title
      const fieldInput = existingCard.querySelector<HTMLInputElement>('.object-field-input')
      if (fieldInput && document.activeElement !== fieldInput && fieldInput.value !== targetField) {
        fieldInput.value = targetField
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card object-transform-card" data-op="${transformOperation}">
        <div class="data-node-header object-transform-header">
          <span class="card-type-label">${badgeText}</span>
          <span class="card-id-label node-title">${title}</span>
        </div>
        <div class="data-node-body">
          <div class="data-node-row port-row-input slot-item-row" style="gap: 6px;">
            <span class="port-label" style="font-size: 10px;">Op</span>
            <ui-select class="node-inline-select object-op-select" size="sm" value="${transformOperation}" style="width: 90px;">
              <option value="pluck" ${transformOperation === 'pluck' ? 'selected' : ''}>pluck</option>
              <option value="merge" ${transformOperation === 'merge' ? 'selected' : ''}>merge</option>
              <option value="pick" ${transformOperation === 'pick' ? 'selected' : ''}>pick</option>
            </ui-select>
          </div>
          ${
            transformOperation === 'pluck' || transformOperation === 'pick'
              ? `
            <div class="data-node-row port-row-input slot-item-row" style="gap: 6px;">
              <span class="port-label" style="font-size: 10px;">Field</span>
              <input
                type="text"
                class="node-inline-input object-field-input"
                value="${targetField}"
                placeholder="field name"
                style="width: 90px;"
              />
            </div>
          `
              : ''
          }
          ${portsHtml}
        </div>
      </div>
    `

    const stopEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
    const operationSelect = this.querySelector<HTMLElement>('.object-op-select')
    const fieldInput = this.querySelector<HTMLInputElement>('.object-field-input')
    for (const element of [operationSelect, fieldInput]) {
      if (!element) continue
      for (const eventName of stopEvents) {
        element.addEventListener(eventName, (event) => event.stopPropagation())
      }
    }
    if (operationSelect) {
      const onOperationChange = () => {
        const nextOperation = ((operationSelect as any).value || 'pluck').toLowerCase()
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
          titleElement.textContent = targetField ? `.${nextField}` : 'Pluck Field'
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

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_OBJECT_TRANSFORM_NODE)) {
  customElements.define(TAG_NAMES.AXON_OBJECT_TRANSFORM_NODE, AxonObjectTransformNode)
}
