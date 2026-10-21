// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import { createEventNode, EventNodeEngine } from '../../../nodes/event.node'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing an Event Node.
 * Supports dual modes:
 * - 'emit': Listens for graph execution trigger and dispatches payload to system EventBus.
 * - 'listen': Listens to external EventBus events and fires downstream graph execution.
 */
export class AxonEventNode extends AxonBaseNodeElement<EventNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): EventNodeEngine {
    return createEventNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.EVENT
    this.setAttribute('data-node-type', NODE_TYPES.EVENT)
    this.classList.add('axon-event-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const eventName = nodeConfiguration.eventName || 'custom:event'
    const operationMode: 'emit' | 'listen' = nodeConfiguration.mode || 'emit'
    const isEmitMode = operationMode === 'emit'

    const availableEvents: string[] = nodeConfiguration.availableEvents || [
      'DAMAGE_DEALT',
      'PLAYER_MOVED',
      'SPELL_CAST',
      'ITEM_EQUIPPED',
      'TURN_STARTED',
      'ROUND_COMPLETED',
      'CHARACTER_UPDATED',
    ]

    // Incremental DOM update: If the card already exists, update text/controls without destroying ports
    const existingCard = this.querySelector('.event-node-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== eventName) {
        titleElement.textContent = eventName
      }
      const eventSelect = existingCard.querySelector<HTMLSelectElement>('.axon-event-select')
      if (eventSelect && document.activeElement !== eventSelect && eventSelect.value !== eventName) {
        eventSelect.value = eventName
      }
      const modeSelect = existingCard.querySelector<HTMLSelectElement>('.axon-event-mode-select')
      if (modeSelect && document.activeElement !== modeSelect && modeSelect.value !== operationMode) {
        modeSelect.value = operationMode
      }
      return
    }

    const eventOptionsHtml = availableEvents.includes(eventName)
      ? availableEvents
          .map((ev) => `<option value="${ev}" ${ev === eventName ? 'selected' : ''}>${ev}</option>`)
          .join('')
      : `<option value="${eventName}" selected>${eventName}</option>` +
        availableEvents.map((ev) => `<option value="${ev}">${ev}</option>`).join('')

    const modeBadgeText = isEmitMode ? 'EVENT DISPATCH' : 'EVENT LISTEN'

    this.innerHTML = `
      <div class="data-node-card event-node-card">
        <div class="data-node-header event-node-header">
          <div class="node-title-group">
            <span class="node-badge event-badge">${modeBadgeText}</span>
            <strong class="node-title">${eventName}</strong>
          </div>
          <span class="node-icon">${isEmitMode ? '📡' : '👂'}</span>
        </div>
        <div class="data-node-body">
          <div class="node-control-row">
            <label class="node-control-label">Mode:</label>
            <ui-select class="node-inline-select axon-event-mode-select" size="sm" value="${operationMode}" title="Choose event mode">
              <option value="emit" ${isEmitMode ? 'selected' : ''}>Emit (Publish)</option>
              <option value="listen" ${!isEmitMode ? 'selected' : ''}>Listen (Subscribe)</option>
            </ui-select>
          </div>
          <div class="node-control-row">
            <label class="node-control-label">Event:</label>
            <ui-select class="node-inline-select axon-event-select" size="sm" value="${eventName}" title="Choose event name">
              ${eventOptionsHtml}
            </ui-select>
          </div>

          ${
            isEmitMode
              ? `
            <div class="ports-category-tag">⚡ Flow In & Payload</div>
            <div class="data-node-row port-row-pair">
              <axon-port-in
                id="${this.id || 'ev'}:trigger"
                port-name="trigger"
                data-type="boolean"
                class="port input flow-port"
              >
                <span class="port-label">▶ Emit (trigger)</span>
              </axon-port-in>
              <span></span>
            </div>
            <div class="data-node-row port-row-pair">
              <axon-port-in
                id="${this.id || 'ev'}:payload"
                port-name="payload"
                data-type="object"
                class="port input"
              >
                <span class="port-label">📦 Payload ({})</span>
              </axon-port-in>
              <span></span>
            </div>

            <div class="ports-category-tag">📊 Flow Out</div>
            <div class="data-node-row port-row-pair">
              <span></span>
              <axon-port-out
                id="${this.id || 'ev'}:out"
                port-name="out"
                data-type="boolean"
                class="port output flow-port"
              >
                <span class="port-label">▶ Done (out)</span>
              </axon-port-out>
            </div>
          `
              : `
            <div class="ports-category-tag">📊 Event Fired Out</div>
            <div class="data-node-row port-row-pair">
              <span></span>
              <axon-port-out
                id="${this.id || 'ev'}:fired"
                port-name="fired"
                data-type="boolean"
                class="port output flow-port"
              >
                <span class="port-label">▶ On Fired</span>
              </axon-port-out>
            </div>
            <div class="data-node-row port-row-pair">
              <span></span>
              <axon-port-out
                id="${this.id || 'ev'}:payload"
                port-name="payload"
                data-type="object"
                class="port output"
              >
                <span class="port-label">📦 Payload ({})</span>
              </axon-port-out>
            </div>
          `
          }
        </div>
      </div>
    `

    const stopPropagationHandler = (pointerEvent: Event) => pointerEvent.stopPropagation()
    const eventSelect = this.querySelector('.axon-event-select') as any
    if (eventSelect) {
      eventSelect.addEventListener('pointerdown', stopPropagationHandler)
      eventSelect.addEventListener('mousedown', stopPropagationHandler)
      eventSelect.addEventListener('click', stopPropagationHandler)
      const onEventChange = (changeEvent: Event) => {
        changeEvent.stopPropagation()
        const selectedEvent = (changeEvent as CustomEvent).detail?.value ?? eventSelect.value
        const patchData = { eventName: selectedEvent }
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
        const titleElement = this.querySelector('.node-title')
        if (titleElement) titleElement.textContent = selectedEvent
      }
      eventSelect.addEventListener('change', onEventChange)
      eventSelect.addEventListener('ui-select-change', onEventChange)
    }

    const modeSelect = this.querySelector('.axon-event-mode-select') as any
    if (modeSelect) {
      modeSelect.addEventListener('pointerdown', stopPropagationHandler)
      modeSelect.addEventListener('mousedown', stopPropagationHandler)
      modeSelect.addEventListener('click', stopPropagationHandler)
      const onModeChange = (changeEvent: Event) => {
        changeEvent.stopPropagation()
        const selectedMode = (changeEvent as CustomEvent).detail?.value ?? modeSelect.value
        const patchData = { mode: selectedMode }
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
      modeSelect.addEventListener('change', onModeChange)
      modeSelect.addEventListener('ui-select-change', onModeChange)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_EVENT_NODE)) {
  customElements.define(TAG_NAMES.AXON_EVENT_NODE, AxonEventNode)
}
