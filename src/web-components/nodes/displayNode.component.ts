import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import { createDisplayNode } from '../../nodes/display.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import { formatValue, escapeHtml } from '../helpers'
import type { BaseNode } from '../../core/base.node'

export class AxonDisplayNode extends AxonBaseNodeElement<BaseNode> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): BaseNode {
    return createDisplayNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.DISPLAY
    this.setAttribute('data-node-type', NODE_TYPES.DISPLAY)
    super.connectedCallback()
  }

  protected override onInputUpdate(_name: string, _value: unknown) {
    this.render()
  }

  render() {
    if (!this.engine) return

    const val = this.engine.getInput('value')
    const displayVal = formatValue(val)
    const data = this.nodeData || (this.engine as any)?.data || {}
    const labelText = typeof data.label === 'string' && data.label.trim() ? data.label : 'Data Monitor'
    const safeLabel = escapeHtml(labelText)
    const safeDisplay = escapeHtml(displayVal)

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header" style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <h3 class="display-title" style="margin: 0; font-size: 12px;">${safeLabel}</h3>
          <input
            type="text"
            class="display-label-input"
            value="${safeLabel}"
            placeholder="Label..."
            title="Edit monitor label"
            style="width: 96px; background: rgba(0,0,0,0.35); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: var(--ui-color-text, #f8fafc); font-size: 11px; padding: 2px 6px;"
          />
        </div>
        <div class="node-body">
          <div class="port-grid">
            <axon-port-in
              id="${this.engine.getPortId('value')}"
              data-type="any"
              class="port input"
              style="--port-color: var(--ui-port-any, #38bdf8);"
            >
              <span class="port-label">Value</span>
            </axon-port-in>
          </div>
          <div class="display-container" style="padding: 4px 10px 10px 10px;">
            <div class="screen" style="background: var(--ui-input-bg, #090d16); border: 1px solid var(--ui-input-border, #1e293b); border-radius: var(--ui-input-radius, 6px); min-height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4); padding: 4px 8px;">
              <code class="output-text" style="font-family: var(--ui-font-mono, monospace); font-size: 14px; font-weight: 700; color: var(--ui-color-success, #10b981); word-break: break-all; text-align: center;">${safeDisplay}</code>
            </div>
          </div>
        </div>
      `

      const labelInput = this.querySelector<HTMLInputElement>('.display-label-input')
      if (labelInput) {
        const stopEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
        for (const evt of stopEvents) {
          labelInput.addEventListener(evt, (e) => e.stopPropagation())
        }
        const onLabelChange = () => {
          const nextLabel = labelInput.value.trim() || 'Data Monitor'
          const currData = this.nodeData || (this.engine as any)?.data || {}
          currData.label = nextLabel
          ;(this as any)._nodeData = currData
          if (this.engine) {
            ;(this.engine as any).data = currData
          }
          const titleEl = this.querySelector('.display-title')
          if (titleEl) titleEl.textContent = nextLabel
          this.dispatchEvent(
            new CustomEvent('node-data-change', {
              detail: { id: this.id, data: currData, label: nextLabel },
              bubbles: true,
              composed: true,
            }),
          )
        }
        labelInput.addEventListener('input', onLabelChange)
        labelInput.addEventListener('change', onLabelChange)
      }
    }

    const titleEl = this.querySelector('.display-title')
    if (titleEl && titleEl.textContent !== labelText) {
      titleEl.textContent = labelText
    }
    const labelInput = this.querySelector<HTMLInputElement>('.display-label-input')
    if (labelInput && document.activeElement !== labelInput && labelInput.value !== labelText) {
      labelInput.value = labelText
    }

    const outputText = this.querySelector('.output-text')
    if (outputText) {
      outputText.textContent = displayVal
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_DISPLAY_NODE)) {
  customElements.define(TAG_NAMES.AXON_DISPLAY_NODE, AxonDisplayNode)
}
