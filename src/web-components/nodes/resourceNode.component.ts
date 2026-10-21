// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import {
  createResourceNode,
  type ResourceNodeData,
  syncResourcePorts,
} from '../../nodes/resource.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import { formatValue } from '../helpers'
import { getTypeFromConstructor } from '../../core/constants'
import type { BaseNode } from '../../core/base.node'

export class AxonResourceNode extends AxonBaseNodeElement<BaseNode> {
  private lastPortSignature = ''

  createEngine(options?: { id?: string; initialData?: any }): BaseNode {
    const initialData: ResourceNodeData = options?.initialData ||
      this.nodeData || {
        resourceName: 'Resource',
      }
    const engine = createResourceNode({ id: options?.id || this.id, initialData })
    syncResourcePorts(engine, initialData.definition)
    return engine
  }

  override get nodeData(): any {
    return super.nodeData
  }

  override set nodeData(val: any) {
    super.nodeData = val
    if (this.engine) {
      this.engine.data = val
      syncResourcePorts(this.engine, val?.definition)
    }
    this.render()
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.RESOURCE
    this.setAttribute('data-node-type', NODE_TYPES.RESOURCE)
    this.classList.add('axon-resource-node')
    super.connectedCallback()

    this.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      this.handleOpen()
    })
  }

  private handleOpen() {
    this.dispatchEvent(
      new CustomEvent('open-resource-subgraph', {
        detail: {
          nodeId: this.id,
          definition: (this.nodeData as ResourceNodeData)?.definition,
        },
        bubbles: true,
        composed: true,
      }),
    )
  }

  render() {
    if (!this.engine) return

    const data = (this.nodeData || this.engine.data || {}) as ResourceNodeData
    syncResourcePorts(this.engine, data.definition)

    const name = data.resourceName || data.definition?.name || 'Resource'
    const ttl = data.cacheTtlMs ?? data.definition?.ttlMs
    const ttlLabel = ttl ? `${ttl}ms` : 'no TTL'

    const inputDefs = this.engine.inputDefinition
    const outputDefs = this.engine.outputDefinition
    const inKeys = Object.keys(inputDefs)
    const outKeys = Object.keys(outputDefs)
    const maxRows = Math.max(inKeys.length, outKeys.length)

    const currentSignature = `${inKeys.join(',')}:${outKeys.join(',')}`

    if (!this.querySelector('.node-body') || this.lastPortSignature !== currentSignature) {
      this.lastPortSignature = currentSignature

      let rowsHtml = ''
      for (let i = 0; i < maxRows; i++) {
        const inKey = inKeys[i]
        const outKey = outKeys[i]

        const inType = inKey ? getTypeFromConstructor(inputDefs[inKey]) : 'any'
        const outType = outKey ? getTypeFromConstructor(outputDefs[outKey]) : 'any'
        const inVal = inKey ? this.engine.getInput(inKey) : undefined
        const outVal = outKey ? this.engine.getOutput(outKey) : undefined

        const leftCol = inKey
          ? `<div class="port-col left" style="flex: 1; min-width: 0; display: flex; justify-content: flex-start;">
              <axon-port-in
                id="${this.engine.getPortId(inKey)}"
                data-type="${inType}"
                class="port input"
                data-port-name="${inKey}"
                style="--port-color: var(--ui-port-${inType}, #38bdf8);"
              >
                <span class="port-label">${inKey}</span>
                <div class="port-slot">
                  <span class="val-preview in-val-preview" style="font-family: var(--ui-font-mono, monospace); font-size: 10px; color: var(--ui-color-text-muted, #64748b);">${formatValue(inVal)}</span>
                </div>
              </axon-port-in>
            </div>`
          : `<div class="port-col left" style="flex: 1; min-width: 0;"></div>`

        const rightCol = outKey
          ? `<div class="port-col right" style="flex: 1; min-width: 0; display: flex; justify-content: flex-end;">
              <axon-port-out
                id="${this.engine.getPortId(outKey)}"
                data-type="${outType}"
                class="port output"
                data-port-name="${outKey}"
                style="--port-color: var(--ui-port-${outType}, #38bdf8);"
              >
                <div class="port-slot">
                  <span class="val-preview out-val-preview" style="font-family: var(--ui-font-mono, monospace); font-size: 10px; color: var(--ui-color-text-muted, #64748b);">${formatValue(outVal)}</span>
                </div>
                <span class="port-label">${outKey}</span>
              </axon-port-out>
            </div>`
          : `<div class="port-col right" style="flex: 1; min-width: 0;"></div>`

        rowsHtml += `
          <div class="port-row" style="display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 28px; gap: 4px;">
            ${leftCol}
            ${rightCol}
          </div>
        `
      }

      this.innerHTML = `
        <div class="node-wrapper resource-node-wrapper" style="
          min-width: 220px;
          background: var(--ui-color-surface-elevated, oklch(0.2 0.025 260));
          border: 1px solid oklch(0.4 0.12 180);
          border-radius: 6px;
          overflow: visible;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
          <div class="resource-header node-header" data-node-header data-drag-handle style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 10px;
            background: oklch(0.32 0.12 180 / 0.5);
            border-bottom: 1px solid oklch(0.4 0.12 180);
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            cursor: grab;
          ">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 12px;">📦</span>
              <span class="resource-title" style="font-size: 12px; font-weight: 700; color: oklch(0.9 0.12 180);">${name}</span>
            </div>
            <span class="ttl-badge" style="font-size: 10px; background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 3px; color: var(--ui-color-text-muted, #94a3b8);">${ttlLabel}</span>
          </div>
          <div class="node-body" style="padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <span style="font-size: 10px; color: var(--ui-color-text-muted, #94a3b8);">Resource</span>
              <input
                type="text"
                class="resource-name-input"
                value="${name}"
                placeholder="Resource"
                style="width: 110px; background: rgba(0,0,0,0.35); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: var(--ui-color-text, #f8fafc); font-size: 11px; padding: 2px 6px;"
              />
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <span style="font-size: 10px; color: var(--ui-color-text-muted, #94a3b8);">TTL (ms)</span>
              <input
                type="number"
                class="resource-ttl-input"
                value="${ttl ?? 0}"
                min="0"
                step="1000"
                style="width: 80px; background: rgba(0,0,0,0.35); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: var(--ui-color-text, #f8fafc); font-family: monospace; font-size: 11px; padding: 2px 6px; text-align: right;"
              />
            </div>
            ${rowsHtml}
          </div>
        </div>
      `

      const nameInput = this.querySelector<HTMLInputElement>('.resource-name-input')
      const ttlInput = this.querySelector<HTMLInputElement>('.resource-ttl-input')
      const stopEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress', 'dblclick']
      for (const el of [nameInput, ttlInput]) {
        if (!el) continue
        for (const evt of stopEvents) {
          el.addEventListener(evt, (e) => e.stopPropagation())
        }
      }

      if (nameInput) {
        const onNameChange = () => {
          const nextName = nameInput.value.trim() || 'Resource'
          const currData = (this.nodeData || this.engine?.data || {}) as ResourceNodeData
          currData.resourceName = nextName
          ;(this as any)._nodeData = currData
          if (this.engine) {
            ;(this.engine.data as ResourceNodeData).resourceName = nextName
          }
          const titleEl = this.querySelector('.resource-title')
          if (titleEl) titleEl.textContent = nextName
          this.dispatchEvent(
            new CustomEvent('node-data-change', {
              detail: { id: this.id, data: currData, resourceName: nextName },
              bubbles: true,
              composed: true,
            }),
          )
        }
        nameInput.addEventListener('input', onNameChange)
        nameInput.addEventListener('change', onNameChange)
      }

      if (ttlInput) {
        const onTtlChange = () => {
          const parsed = Number(ttlInput.value)
          const nextTtl = Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed
          const currData = (this.nodeData || this.engine?.data || {}) as ResourceNodeData
          currData.cacheTtlMs = nextTtl
          ;(this as any)._nodeData = currData
          if (this.engine) {
            ;(this.engine.data as ResourceNodeData).cacheTtlMs = nextTtl
          }
          const ttlEl = this.querySelector('.ttl-badge')
          if (ttlEl) ttlEl.textContent = nextTtl ? `${nextTtl}ms` : 'no TTL'
          this.dispatchEvent(
            new CustomEvent('node-data-change', {
              detail: { id: this.id, data: currData, cacheTtlMs: nextTtl },
              bubbles: true,
              composed: true,
            }),
          )
        }
        ttlInput.addEventListener('input', onTtlChange)
        ttlInput.addEventListener('change', onTtlChange)
      }
    } else {
      // Dynamic update of label/title without full rerender
      const titleEl = this.querySelector('.resource-title')
      if (titleEl) titleEl.textContent = name
      const ttlEl = this.querySelector('.ttl-badge')
      if (ttlEl) ttlEl.textContent = ttlLabel
      const nameInput = this.querySelector<HTMLInputElement>('.resource-name-input')
      if (nameInput && document.activeElement !== nameInput && nameInput.value !== name) {
        nameInput.value = name
      }
      const ttlInput = this.querySelector<HTMLInputElement>('.resource-ttl-input')
      if (ttlInput && document.activeElement !== ttlInput) {
        ttlInput.value = String(ttl ?? 0)
      }
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_RESOURCE_NODE)) {
  customElements.define(TAG_NAMES.AXON_RESOURCE_NODE, AxonResourceNode)
}
