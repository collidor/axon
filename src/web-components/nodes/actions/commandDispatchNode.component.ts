// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createCommandDispatchNode,
  CommandDispatchNodeEngine,
} from '../../../nodes/commandDispatch.node'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Command Dispatch Node.
 * When the incoming trigger port receives a signal, this node packages
 * the payload input and executes the specified command via the system CommandBus.
 */
export class AxonCommandDispatchNode extends AxonBaseNodeElement<CommandDispatchNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): CommandDispatchNodeEngine {
    return createCommandDispatchNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.COMMAND_DISPATCH
    this.setAttribute('data-node-type', NODE_TYPES.COMMAND_DISPATCH)
    this.classList.add('axon-command-dispatch-node')
    super.connectedCallback()
  }

  /**
   * Directly triggers and executes the configured command via the node engine.
   */
  public triggerCommand(): any {
    if (!this.engine) return null
    return this.engine.dispatchCommand()
  }

  render() {
    const isTriggerConnected = this.isPortConnected('trigger')
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const commandName = nodeConfiguration.commandName || 'DealDamageCommand'
    const recordUndoHistory = Boolean(nodeConfiguration.useHistory)
    const availableCommands: string[] = nodeConfiguration.availableCommands || [
      'DealDamageCommand',
      'HealTargetCommand',
      'AddItemCommand',
      'RemoveItemCommand',
      'EquipItemCommand',
      'SaveCharacterCommand',
      'RollDiceCommand',
    ]

    // Incremental DOM update: If the card already exists, update title and control values without destroying ports
    const existingCard = this.querySelector('.command-dispatch-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement && titleElement.textContent !== commandName) {
        titleElement.textContent = commandName
      }
      const commandSelect = existingCard.querySelector<HTMLSelectElement>('.axon-command-select')
      if (commandSelect && document.activeElement !== commandSelect && commandSelect.value !== commandName) {
        commandSelect.value = commandName
      }
      const historyCheckbox = existingCard.querySelector<any>('.axon-history-checkbox')
      if (historyCheckbox && historyCheckbox.checked !== recordUndoHistory) {
        historyCheckbox.checked = recordUndoHistory
      }
      const triggerSlot = existingCard.querySelector<HTMLElement>('.command-trigger-slot')
      if (triggerSlot) {
        triggerSlot.style.display = isTriggerConnected ? 'none' : 'inline-flex'
      }
      return
    }

    const commandOptionsHtml = availableCommands.includes(commandName)
      ? availableCommands
          .map((cmd) => `<option value="${cmd}" ${cmd === commandName ? 'selected' : ''}>${cmd}</option>`)
          .join('')
      : `<option value="${commandName}" selected>${commandName}</option>` +
        availableCommands.map((cmd) => `<option value="${cmd}">${cmd}</option>`).join('')

    this.innerHTML = `
      <div class="data-node-card command-dispatch-card">
        <div class="data-node-header command-dispatch-header">
          <div class="node-title-group">
            <span class="node-badge command-badge">COMMAND DISPATCH</span>
            <strong class="node-title">${commandName}</strong>
          </div>
          <span class="node-icon">🚀</span>
        </div>
        <div class="data-node-body">
          <div class="node-control-row">
            <label class="node-control-label">Command:</label>
            <ui-select class="node-inline-select axon-command-select" size="sm" value="${commandName}" title="Choose command to execute">
              ${commandOptionsHtml}
            </ui-select>
          </div>
          <div class="node-control-row">
            <label class="node-control-label" style="cursor: pointer; display: flex; align-items: center; gap: var(--ui-space-2xs, 0.382em);">
              <ui-switch class="axon-history-checkbox" size="sm" ${recordUndoHistory ? 'checked' : ''}></ui-switch>
              <span>Record Undo</span>
            </label>
          </div>

          <div class="ports-category-tag">⚡ Flow In & Payload</div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.engine?.getPortId('trigger') ?? (this.id ? `${this.id}:trigger` : 'dispatch:trigger')}"
              port-name="trigger"
              data-type="boolean"
              class="port input flow-port"
            >
              <span class="port-label">▶ Exec (trigger)</span>
              <div class="port-slot command-trigger-slot" style="display: ${isTriggerConnected ? 'none' : 'inline-flex'};">
                <button
                  type="button"
                  class="command-trigger-btn"
                  title="Execute command immediately"
                >
                  Exec ▶
                </button>
              </div>
            </axon-port-in>
            <span></span>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'dispatch'}:data"
              port-name="data"
              data-type="object"
              class="port input"
            >
              <span class="port-label">📦 Payload / Data ({})</span>
            </axon-port-in>
            <axon-port-out
              id="${this.id || 'dispatch'}:result"
              port-name="result"
              data-type="any"
              class="port output"
            >
              <span class="port-label">Result</span>
            </axon-port-out>
          </div>

          <div class="ports-category-tag">📊 Outputs & Flow Out</div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'dispatch'}:success"
              port-name="success"
              data-type="boolean"
              class="port output"
            >
              <span class="port-label">Success (true/false)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'dispatch'}:error"
              port-name="error"
              data-type="any"
              class="port output error-port"
            >
              <span class="port-label">⚠️ Error</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'dispatch'}:out"
              port-name="out"
              data-type="boolean"
              class="port output flow-port"
            >
              <span class="port-label">▶ Completed (out)</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `

    const stopPropagationHandler = (pointerEvent: Event) => pointerEvent.stopPropagation()
    const commandSelect = this.querySelector('.axon-command-select') as any
    if (commandSelect) {
      commandSelect.addEventListener('pointerdown', stopPropagationHandler)
      commandSelect.addEventListener('mousedown', stopPropagationHandler)
      commandSelect.addEventListener('click', stopPropagationHandler)
      const onCommandChange = (changeEvent: Event) => {
        changeEvent.stopPropagation()
        const selectedCommand = (changeEvent as CustomEvent).detail?.value ?? commandSelect.value
        const patchData = { commandName: selectedCommand }
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
        if (titleElement) titleElement.textContent = selectedCommand
      }
      commandSelect.addEventListener('change', onCommandChange)
      commandSelect.addEventListener('ui-select-change', onCommandChange)
    }

    const historyBox = this.querySelector('.axon-history-checkbox') as any
    if (historyBox) {
      historyBox.addEventListener('pointerdown', stopPropagationHandler)
      historyBox.addEventListener('mousedown', stopPropagationHandler)
      historyBox.addEventListener('click', stopPropagationHandler)
      const onSwitchChange = (switchEvent: Event) => {
        switchEvent.stopPropagation()
        const isChecked = (switchEvent as CustomEvent).detail?.checked ?? historyBox.checked
        const patchData = { useHistory: Boolean(isChecked) }
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
      historyBox.addEventListener('change', onSwitchChange)
      historyBox.addEventListener('ui-switch-change', onSwitchChange)
    }

    const triggerBtn = this.querySelector('.command-trigger-btn') as HTMLElement | null
    if (triggerBtn) {
      triggerBtn.addEventListener('pointerdown', stopPropagationHandler)
      triggerBtn.addEventListener('mousedown', stopPropagationHandler)
      triggerBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        triggerBtn.classList.add('is-active')
        setTimeout(() => triggerBtn.classList.remove('is-active'), 150)
        this.triggerCommand()
      })
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_COMMAND_DISPATCH_NODE)) {
  customElements.define(TAG_NAMES.AXON_COMMAND_DISPATCH_NODE, AxonCommandDispatchNode)
}
