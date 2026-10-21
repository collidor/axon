// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createComponentOutputNode,
  ComponentOutputNodeEngine,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Component Output Node.
 * Serves as the fixed boundary bridge between graph execution logic
 * and an external host UI component (e.g. data table, form, modal dialog).
 */
export class AxonComponentOutputNode extends AxonBaseNodeElement<ComponentOutputNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): ComponentOutputNodeEngine {
    return createComponentOutputNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.COMPONENT_OUTPUT
    this.setAttribute('data-node-type', NODE_TYPES.COMPONENT_OUTPUT)
    this.classList.add('axon-component-output-node')
    super.connectedCallback()
  }

  isSlotWired(slotName: string): boolean {
    if (this.isPortConnected(slotName)) return true
    const parentGraph = this.graph || (this.closest('axon-graph') as any)
    if (parentGraph?.edges && Array.isArray(parentGraph.edges)) {
      const targetPortIdentifier = `${this.id || 'output'}:${slotName}`
      return parentGraph.edges.some(
        (edge: any) => edge.to === targetPortIdentifier || edge.toPort?.id === targetPortIdentifier,
      )
    }
    return false
  }

  private attachInputListeners(inputElement: HTMLInputElement) {
    const inputInteractionEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
    for (const eventName of inputInteractionEvents) {
      inputElement.addEventListener(eventName, (event) => event.stopPropagation())
    }

    const handleUpdate = () => {
      const slotName = inputElement.getAttribute('data-slot')
      const dataType = inputElement.getAttribute('data-type')
      if (!slotName) return

      let parsedValue: any
      if (dataType === 'boolean') {
        parsedValue = inputElement.checked
      } else if (dataType === 'number') {
        parsedValue = inputElement.value === '' ? undefined : Number(inputElement.value)
      } else {
        parsedValue = inputElement.value
        if (
          (dataType === 'array' || dataType === 'object') &&
          (inputElement.value.startsWith('[') || inputElement.value.startsWith('{'))
        ) {
          try {
            parsedValue = JSON.parse(inputElement.value)
          } catch {
            // Keep as raw string if JSON parsing fails
          }
        }
      }

      const currentConfiguration = this.nodeData || (this.engine as any)?.data || {}
      if (!currentConfiguration.values) {
        currentConfiguration.values = {}
      }
      currentConfiguration.values[slotName] = parsedValue

      // Update internal data directly without triggering full node re-render
      ;(this as any)._nodeData = currentConfiguration
      if (this.engine) {
        ;(this.engine as any).data = currentConfiguration
      }

      // Dispatch events for editor workspace and reactive graphs
      this.dispatchEvent(
        new CustomEvent('node-data-change', {
          detail: { id: this.id, data: currentConfiguration, slot: slotName, value: parsedValue },
          bubbles: true,
          composed: true,
        }),
      )
    }

    inputElement.addEventListener('change', handleUpdate)
    if (inputElement.type !== 'checkbox') {
      inputElement.addEventListener('input', handleUpdate)
    }
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const title = nodeConfiguration.title || 'Component Output'
    const values = nodeConfiguration.values || nodeConfiguration.props || {}
    const slots: Array<{ name: string; type?: string; label?: string; isTabSlot?: boolean }> =
      Array.isArray(nodeConfiguration.slots) && nodeConfiguration.slots.length > 0
        ? nodeConfiguration.slots
        : Array.isArray(nodeConfiguration.ports)
          ? nodeConfiguration.ports
          : [
              { name: 'visible', type: 'boolean', label: 'Visible' },
              { name: 'disabled', type: 'boolean', label: 'Disabled' },
            ]

    const controlSlots = slots.filter(
      (slot) => !slot.isTabSlot && !slot.name.startsWith('tab:') && !slot.name.startsWith('tab_'),
    )
    const tabSlots = slots.filter(
      (slot) => slot.isTabSlot || slot.name.startsWith('tab:') || slot.name.startsWith('tab_'),
    )

    const existingCard = this.querySelector('.component-output-card')
    const slotsSignature = slots.map((s) => `${s.name}:${s.type || 'boolean'}`).join(',')

    // Incremental DOM update: If card exists and slot schema hasn't changed, preserve port DOM elements and focus!
    if (existingCard && (existingCard as any).__slotsSignature === slotsSignature) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== title) {
        titleElement.textContent = title
      }

      for (const slot of slots) {
        const rowElement = existingCard.querySelector(`.slot-item-row[data-slot-row="${slot.name}"]`)
        if (!rowElement) continue

        const isWired = this.isSlotWired(slot.name)
        rowElement.classList.toggle('is-wired', isWired)

        const controlContainer = rowElement.querySelector('.slot-control-container')
        if (!controlContainer) continue

        if (isWired) {
          if (!controlContainer.querySelector('.slot-bound-badge')) {
            controlContainer.innerHTML =
              '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
          }
        } else {
          const inputElement = controlContainer.querySelector<HTMLInputElement>('.slot-input')
          if (!inputElement) {
            controlContainer.innerHTML = this.renderSingleControl(slot, values[slot.name])
            const newInput = controlContainer.querySelector<HTMLInputElement>('.slot-input')
            if (newInput) this.attachInputListeners(newInput)
          } else if (document.activeElement !== inputElement) {
            // Only update value if the user is not actively typing in this input
            const slotVal = values[slot.name]
            const slotType = slot.type || 'boolean'
            if (slotType === 'boolean') {
              inputElement.checked = Boolean(slotVal === true || slotVal === 'true')
            } else if (slotType === 'number') {
              inputElement.value = slotVal !== undefined && slotVal !== null ? String(slotVal) : ''
            } else {
              inputElement.value =
                slotVal !== undefined && slotVal !== null
                  ? typeof slotVal === 'object'
                    ? JSON.stringify(slotVal)
                    : String(slotVal)
                  : ''
            }
          }
        }
      }
      return
    }

    // Full Initial Render
    const renderInlineControl = (slot: (typeof slots)[0], isWired: boolean) => {
      if (isWired) {
        return '<span class="slot-bound-badge" title="Controlled by incoming connection">⚡ Bound</span>'
      }
      return this.renderSingleControl(slot, values[slot.name])
    }

    const renderSlotRows = (list: typeof slots) =>
      list
        .map((slot) => {
          const isWired = this.isSlotWired(slot.name)
          const portId = `${this.id || 'output'}:${slot.name}`
          const dataType = slot.type || 'boolean'

          return `
            <div class="slot-item-row ${isWired ? 'is-wired' : ''}" data-slot-row="${slot.name}">
              <axon-port-in
                id="${portId}"
                port-name="${slot.name}"
                data-type="${dataType}"
                class="port input"
              >
                <span class="port-label">${slot.label || slot.name} <span class="port-type-tag ${dataType}">(${dataType})</span></span>
              </axon-port-in>
              <div class="slot-control-container">
                ${renderInlineControl(slot, isWired)}
              </div>
            </div>
          `
        })
        .join('')

    const componentType = (nodeConfiguration.componentType || '').toLowerCase()
    const titleLower = title.toLowerCase()

    const events: Array<{ name: string; type?: string; label?: string }> =
      Array.isArray(nodeConfiguration.events) && nodeConfiguration.events.length > 0
        ? nodeConfiguration.events
        : componentType === 'table' || titleLower.includes('table')
          ? [
              { name: 'pageChange', type: 'boolean', label: 'Page Change' },
              { name: 'nextPage', type: 'boolean', label: 'Next Page' },
              { name: 'prevPage', type: 'boolean', label: 'Prev Page' },
              { name: 'sort', type: 'boolean', label: 'Column Sort' },
              { name: 'rowClick', type: 'boolean', label: 'Row Click' },
              { name: 'selectionChange', type: 'boolean', label: 'Selection' },
              { name: 'page', type: 'number', label: 'Page Number' },
              { name: 'row', type: 'object', label: 'Clicked Row' },
            ]
          : componentType === 'form' || componentType === 'form-container' || titleLower.includes('form')
            ? [
                { name: 'submit', type: 'boolean', label: 'Form Submit' },
                { name: 'reset', type: 'boolean', label: 'Form Reset' },
                { name: 'values', type: 'object', label: 'Form Values' },
              ]
            : componentType === 'list' || componentType === 'repeater' || titleLower.includes('list')
              ? [
                  { name: 'pageChange', type: 'boolean', label: 'Page Change' },
                  { name: 'itemClick', type: 'boolean', label: 'Item Click' },
                  { name: 'page', type: 'number', label: 'Page Number' },
                  { name: 'item', type: 'object', label: 'Clicked Item' },
                ]
              : componentType === 'tabs' || titleLower.includes('tabs')
                ? [
                    { name: 'tabChange', type: 'boolean', label: 'Tab Change' },
                    { name: 'activeTab', type: 'string', label: 'Active Tab ID' },
                  ]
                : componentType === 'button' ||
                    componentType === 'dice-button' ||
                    titleLower.includes('button')
                  ? [
                      { name: 'click', type: 'boolean', label: 'Click Trigger' },
                      ...(componentType === 'dice-button'
                        ? [{ name: 'formula', type: 'string', label: 'Dice Formula' }]
                        : []),
                    ]
                  : ['input', 'textarea', 'number-stepper', 'select', 'checkbox'].includes(componentType)
                    ? [
                        { name: 'change', type: 'boolean', label: 'Value Change' },
                        { name: 'value', type: 'string', label: 'Field Value' },
                      ]
                    : [
                          'stat-block',
                          'stat-stack',
                          'resource-bar',
                          'card',
                          'alert',
                          'badge',
                        ].includes(componentType)
                      ? [{ name: 'click', type: 'boolean', label: 'Click Trigger' }]
                      : []

    this.innerHTML = `
      <div class="data-node-card component-output-card">
        <div class="data-node-header component-output-header">
          <div class="node-title-group" style="display: flex; align-items: center; gap: 6px;">
            <span class="node-badge output-badge">OUTPUT</span>
            <strong class="node-title">${title}</strong>
          </div>
          <span class="node-lock-icon" title="Fixed component output node (undeletable)">🔒</span>
        </div>
        <div class="data-node-body">
          <div class="ports-category-tag">🎛️ Control Slots</div>
          ${renderSlotRows(controlSlots)}
          ${
            tabSlots.length > 0
              ? `
            <div class="ports-category-tag">📑 Tabs Open & Names</div>
            ${renderSlotRows(tabSlots)}
          `
              : ''
          }
          ${
            events.length > 0
              ? `
            <div class="ports-category-tag">⚡ Event Trigger Outputs</div>
            ${events
              .map(
                (ev) => `
              <div class="slot-item-row" data-event-row="${ev.name}">
                <axon-port-out
                  id="${this.id || 'output'}:${ev.name}"
                  port-name="${ev.name}"
                  data-type="${ev.type || 'boolean'}"
                  class="port output"
                >
                  <span class="port-label">${ev.label || ev.name} <span class="port-type-tag ${ev.type || 'boolean'}">(${ev.type || 'trigger'})</span></span>
                </axon-port-out>
              </div>
            `,
              )
              .join('')}
          `
              : ''
          }
        </div>
      </div>
    `

    const newCard = this.querySelector('.component-output-card')
    if (newCard) {
      ;(newCard as any).__slotsSignature = slotsSignature
    }

    const inputs = this.querySelectorAll<HTMLInputElement>('.slot-input')
    inputs.forEach((input) => this.attachInputListeners(input))
  }

  private renderSingleControl(
    slot: { name: string; type?: string; label?: string },
    value: any,
  ): string {
    const slotType = slot.type || 'boolean'
    if (slotType === 'boolean') {
      const isChecked = Boolean(value === true || value === 'true')
      return `
        <label class="slot-toggle-switch" title="Toggle ${slot.label || slot.name}">
          <input
            type="checkbox"
            class="slot-input slot-boolean-input"
            data-slot="${slot.name}"
            data-type="boolean"
            ${isChecked ? 'checked' : ''}
          />
          <span class="slot-toggle-slider"></span>
        </label>
      `
    }

    if (slotType === 'number') {
      const numberValue = value !== undefined && value !== null ? value : ''
      return `
        <input
          type="number"
          class="slot-input slot-number-input"
          data-slot="${slot.name}"
          data-type="number"
          value="${numberValue}"
          placeholder="0"
        />
      `
    }

    const stringValue =
      value !== undefined && value !== null
        ? typeof value === 'object'
          ? JSON.stringify(value).replace(/"/g, '&quot;')
          : String(value).replace(/"/g, '&quot;')
        : ''

    return `
      <input
        type="text"
        class="slot-input slot-text-input"
        data-slot="${slot.name}"
        data-type="${slotType}"
        value="${stringValue}"
        placeholder="${slot.label || slot.name}..."
      />
    `
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_COMPONENT_OUTPUT_NODE)) {
  customElements.define(TAG_NAMES.AXON_COMPONENT_OUTPUT_NODE, AxonComponentOutputNode)
}
