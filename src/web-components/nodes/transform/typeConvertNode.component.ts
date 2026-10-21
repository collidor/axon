// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createTypeConvertNode,
  TypeConvertNodeEngine,
} from '../../../nodes/typeConvert.node'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Type Conversion Node.
 * Casts incoming values into integer, number, string, boolean, or json format,
 * supporting configurable fallbacks if parsing fails.
 */
export class AxonTypeConvertNode extends AxonBaseNodeElement<TypeConvertNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): TypeConvertNodeEngine {
    return createTypeConvertNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.TYPE_CONVERT
    this.setAttribute('data-node-type', NODE_TYPES.TYPE_CONVERT)
    this.classList.add('axon-type-convert-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const targetType = nodeConfiguration.targetType || 'integer'
    const fallbackValue = nodeConfiguration.fallback !== undefined ? nodeConfiguration.fallback : ''

    const renderFallbackHtml = (type: string, val: any) => {
      if (type === 'integer') {
        return `
          <input
            type="number"
            step="1"
            class="node-inline-input axon-fallback-input"
            value="${val}"
            placeholder="0"
            title="Fallback integer"
          />`
      } else if (type === 'number') {
        return `
          <input
            type="number"
            step="any"
            class="node-inline-input axon-fallback-input"
            value="${val}"
            placeholder="0.0"
            title="Fallback number"
          />`
      } else if (type === 'boolean') {
        return `
          <ui-select class="node-inline-select axon-fallback-select" size="sm" value="${val ?? ''}" title="Fallback boolean">
            <option value="" ${val === '' || val === undefined ? 'selected' : ''}>(none)</option>
            <option value="true" ${val === true || val === 'true' ? 'selected' : ''}>true</option>
            <option value="false" ${val === false || val === 'false' ? 'selected' : ''}>false</option>
          </ui-select>`
      } else {
        return `
          <input
            type="text"
            class="node-inline-input axon-fallback-input"
            value="${val}"
            placeholder="fallback"
            title="Fallback value"
          />`
      }
    }

    // Incremental DOM update: preserve port elements and update only target type select & fallback slot
    const existingCard = this.querySelector('.convert-node-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== (this.id || targetType)) {
        titleElement.textContent = this.id || targetType
      }
      const targetSelect = existingCard.querySelector<HTMLSelectElement>('.axon-convert-target-select')
      if (targetSelect && document.activeElement !== targetSelect && targetSelect.value !== targetType) {
        targetSelect.value = targetType
      }
      const outputPort = existingCard.querySelector<HTMLElement>('axon-port-out[port-name="output"]')
      if (outputPort) {
        if (outputPort.getAttribute('data-type') !== targetType) {
          outputPort.setAttribute('data-type', targetType)
        }
        const portLabel = outputPort.querySelector('.port-label')
        if (portLabel && portLabel.textContent !== `Output (${targetType})`) {
          portLabel.textContent = `Output (${targetType})`
        }
      }
      const fallbackSlot = existingCard.querySelector<HTMLElement>('.convert-fallback-slot')
      if (fallbackSlot && fallbackSlot.dataset.targetType !== targetType) {
        fallbackSlot.dataset.targetType = targetType
        fallbackSlot.innerHTML = renderFallbackHtml(targetType, fallbackValue)
        this.attachFallbackListeners(fallbackSlot, targetType)
      }
      return
    }

    this.innerHTML = `
      <div class="data-node-card convert-node-card">
        <div class="data-node-header convert-node-header">
          <span class="card-type-label">Convert</span>
          <span class="card-id-label node-title">${this.id || targetType}</span>
        </div>
        <div class="data-node-body">
          <div class="node-control-row">
            <label class="node-control-label">To:</label>
            <ui-select class="node-inline-select axon-convert-target-select" size="sm" value="${targetType}" title="Target type">
              <option value="integer" ${targetType === 'integer' ? 'selected' : ''}>integer (parseInt)</option>
              <option value="number" ${targetType === 'number' ? 'selected' : ''}>number (parseFloat)</option>
              <option value="string" ${targetType === 'string' ? 'selected' : ''}>string</option>
              <option value="boolean" ${targetType === 'boolean' ? 'selected' : ''}>boolean</option>
              <option value="json" ${targetType === 'json' ? 'selected' : ''}>json</option>
            </ui-select>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in id="${this.id || 'tc'}:input" port-name="input" class="port input">
              <span class="port-label">Input</span>
            </axon-port-in>
            <axon-port-out id="${this.id || 'tc'}:output" port-name="output" data-type="${targetType}" class="port output">
              <span class="port-label">Output (${targetType})</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-input">
            <axon-port-in id="${this.id || 'tc'}:fallback" port-name="fallback" class="port input">
              <span class="port-label">Fallback</span>
            </axon-port-in>
            <div class="node-row-control convert-fallback-slot" data-target-type="${targetType}">
              ${renderFallbackHtml(targetType, fallbackValue)}
            </div>
          </div>
        </div>
      </div>
    `

    const stopPropagationHandler = (pointerEvent: Event) => pointerEvent.stopPropagation()
    const targetSelect = this.querySelector('.axon-convert-target-select') as any
    if (targetSelect) {
      targetSelect.addEventListener('pointerdown', stopPropagationHandler)
      targetSelect.addEventListener('mousedown', stopPropagationHandler)
      targetSelect.addEventListener('click', stopPropagationHandler)
      const onTargetChange = (changeEvent: Event) => {
        changeEvent.stopPropagation()
        const newTarget = (changeEvent as CustomEvent).detail?.value ?? targetSelect.value
        const patchData = { targetType: newTarget }
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
      targetSelect.addEventListener('change', onTargetChange)
      targetSelect.addEventListener('ui-select-change', onTargetChange)
    }

    const fallbackSlot = this.querySelector<HTMLElement>('.convert-fallback-slot')
    if (fallbackSlot) {
      this.attachFallbackListeners(fallbackSlot, targetType)
    }
  }

  private attachFallbackListeners(container: HTMLElement, targetType: string) {
    const stopPropagationHandler = (pointerEvent: Event) => pointerEvent.stopPropagation()
    const fallbackInput = container.querySelector<HTMLInputElement>('.axon-fallback-input')
    if (fallbackInput) {
      fallbackInput.addEventListener('pointerdown', stopPropagationHandler)
      fallbackInput.addEventListener('mousedown', stopPropagationHandler)
      fallbackInput.addEventListener('click', stopPropagationHandler)
      fallbackInput.addEventListener('keydown', stopPropagationHandler)
      fallbackInput.addEventListener('keyup', stopPropagationHandler)

      const handleFallback = () => {
        const rawValue = fallbackInput.value.trim()
        let parsedValue: any = rawValue
        if (targetType === 'integer') {
          parsedValue = rawValue === '' ? undefined : parseInt(rawValue, 10)
        } else if (targetType === 'number') {
          parsedValue = rawValue === '' ? undefined : parseFloat(rawValue)
        }
        const patchData = { fallback: parsedValue }
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
      }

      fallbackInput.addEventListener('change', handleFallback)
    }

    const fallbackSelect = container.querySelector('.axon-fallback-select') as any
    if (fallbackSelect) {
      fallbackSelect.addEventListener('pointerdown', stopPropagationHandler)
      fallbackSelect.addEventListener('mousedown', stopPropagationHandler)
      fallbackSelect.addEventListener('click', stopPropagationHandler)
      const onFallbackChange = (changeEvent: Event) => {
        changeEvent.stopPropagation()
        const selectedValue = (changeEvent as CustomEvent).detail?.value ?? fallbackSelect.value
        const parsedValue = selectedValue === '' ? undefined : selectedValue === 'true'
        const patchData = { fallback: parsedValue }
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
      }
      fallbackSelect.addEventListener('change', onFallbackChange)
      fallbackSelect.addEventListener('ui-select-change', onFallbackChange)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_TYPE_CONVERT_NODE)) {
  customElements.define(TAG_NAMES.AXON_TYPE_CONVERT_NODE, AxonTypeConvertNode)
}
