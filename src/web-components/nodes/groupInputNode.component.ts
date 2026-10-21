import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import { createGroupInputNode, type GroupData } from '../../nodes/subgraph.node'
import type { BaseNode } from '../../core/base.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import { formatValue } from '../helpers'

export class AxonGroupInputNode extends AxonBaseNodeElement<BaseNode> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): BaseNode {
    const initialData: GroupData = {
      name: options?.initialData?.name || this.nodeData?.name || 'input',
      type: options?.initialData?.type || this.nodeData?.type || 'number',
    }
    return createGroupInputNode({ id: options?.id || this.id, initialData })
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.GROUP_INPUT
    this.setAttribute('data-node-type', NODE_TYPES.GROUP_INPUT)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const data = (this.engine.data as GroupData) || { name: 'input', type: 'number' }
    const name = data.name || 'input'
    const type = data.type || 'number'
    const liveVal = this.engine.getOutput('value') ?? this.engine.getInput('value')
    const formattedVal = liveVal !== undefined ? formatValue(liveVal) : ''

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px;">📥</span>
            <h3 class="header-title">Input: ${name}</h3>
          </div>
        </div>
        <div class="node-body">
          <div class="config" style="padding: 6px 12px; display: flex; flex-direction: column; gap: 6px;">
            <div class="field-row" style="display: flex; flex-direction: column; gap: 2px;">
              <label style="font-size: 9px; text-transform: uppercase; color: var(--ui-color-text-muted, #94a3b8); letter-spacing: 0.05em; font-weight: 700;">Port Name</label>
              <ui-input value="${name}" size="sm" placeholder="Name" class="name-input"></ui-input>
            </div>
            <div class="field-row" style="display: flex; flex-direction: column; gap: 2px;">
              <label style="font-size: 9px; text-transform: uppercase; color: var(--ui-color-text-muted, #94a3b8); letter-spacing: 0.05em; font-weight: 700;">Data Type</label>
              <ui-select value="${type}" size="sm" class="type-select">
                <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
                <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
                <option value="any" ${type === 'any' ? 'selected' : ''}>Any</option>
              </ui-select>
            </div>
            <div class="live-val-box" style="display: ${liveVal !== undefined ? 'flex' : 'none'}; justify-content: space-between; align-items: center; background: var(--ui-input-bg, #090d16); border: 1px solid var(--ui-input-border, #1e293b); padding: 3px 6px; border-radius: 4px; font-family: var(--ui-font-mono, monospace); font-size: 10px;">
              <span style="color: var(--ui-color-text-muted, #64748b);">Incoming:</span>
              <span class="live-val-text" style="color: var(--ui-color-accent, #38bdf8); font-weight: 700;">${formattedVal}</span>
            </div>
          </div>
          <div class="port-grid">
            <axon-port-out
              id="${this.engine.getPortId('value')}"
              data-type="${type}"
              class="port output"
              style="--port-color: var(--ui-port-${type}, #38bdf8);"
            >
              <span class="port-val-preview" style="font-family: var(--ui-font-mono, monospace); font-size: 10px; color: var(--ui-color-accent, #38bdf8); font-weight: 600;">${formattedVal}</span>
              <span class="port-label">Inside</span>
            </axon-port-out>
          </div>
        </div>
      `

      const nameInput = this.querySelector('.name-input')
      nameInput?.addEventListener('ui-input', (e: Event) => {
        const val = String((e as CustomEvent).detail.value)
        if (this.engine) {
          ;(this.engine.data as GroupData).name = val
          this.setInput('name', val)
          const headerTitle = this.querySelector('.header-title')
          if (headerTitle) headerTitle.textContent = `Input: ${val}`
        }
      })

      const typeSelect = this.querySelector('.type-select')
      typeSelect?.addEventListener('ui-change', (e: Event) => {
        const val = String((e as CustomEvent).detail.value)
        if (this.engine) {
          ;(this.engine.data as GroupData).type = val
          this.setInput('type', val)
          const port = this.querySelector<HTMLElement>('axon-port-out')
          if (port) {
            port.setAttribute('data-type', val)
            port.style.setProperty('--port-color', `var(--ui-port-${val}, #38bdf8)`)
          }
        }
      })
    }

    const liveValBox = this.querySelector<HTMLElement>('.live-val-box')
    if (liveValBox) {
      liveValBox.style.display = liveVal !== undefined ? 'flex' : 'none'
    }
    const liveValText = this.querySelector('.live-val-text')
    if (liveValText) {
      liveValText.textContent = formattedVal
    }
    const portPreview = this.querySelector('.port-val-preview')
    if (portPreview) {
      portPreview.textContent = formattedVal
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_GROUP_INPUT_NODE)) {
  customElements.define(TAG_NAMES.AXON_GROUP_INPUT_NODE, AxonGroupInputNode)
}
