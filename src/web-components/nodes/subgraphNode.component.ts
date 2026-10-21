import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import { createSubgraphNode, type SubgraphData, syncSubgraphPorts } from '../../nodes/subgraph.node'
import { loadHeadlessGraph } from '../../core/serialization'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import { formatValue } from '../helpers'
import { getTypeFromConstructor } from '../../core/constants'
import type { BaseNode } from '../../core/base.node'

export class AxonSubgraphNode extends AxonBaseNodeElement<BaseNode> {
  private lastPortSignature = ''

  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): BaseNode {
    const initialData: SubgraphData = options?.initialData ||
      this.nodeData || {
        name: 'Subgraph',
        graph: { nodes: [], edges: [] },
      }
    const engine = createSubgraphNode({ id: options?.id || this.id, initialData })
    syncSubgraphPorts(engine)
    return engine
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  override get nodeData(): any {
    return super.nodeData
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  override set nodeData(val: any) {
    super.nodeData = val
    if (this.engine && val?.graph) {
      // oxlint-disable-next-line typescript/no-explicit-any
      const state = (this.engine as any).state
      if (state) {
        state.innerGraph = loadHeadlessGraph(val.graph)
        // oxlint-disable-next-line typescript/no-explicit-any
        syncSubgraphPorts(this.engine as any)
      }
    }
    this.render()
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.SUBGRAPH
    this.setAttribute('data-node-type', NODE_TYPES.SUBGRAPH)
    super.connectedCallback()

    this.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      this.handleOpen()
    })
  }

  private handleOpen() {
    this.dispatchEvent(
      new CustomEvent('open-subgraph', {
        detail: this.id,
        bubbles: true,
        composed: true,
      }),
    )
  }

  render() {
    if (!this.engine) return

    // Ensure ports are synced
    syncSubgraphPorts(this.engine)

    const name =
      (this.nodeData as SubgraphData)?.name ||
      (this.engine.data as SubgraphData)?.name ||
      'Subgraph'
    const innerNodes = (
      this.engine as unknown as { state?: { innerGraph?: { nodes?: unknown[] } } }
    ).state?.innerGraph?.nodes
    const innerCount = innerNodes
      ? innerNodes.length
      : ((this.nodeData as SubgraphData)?.graph?.nodes?.length ?? 0)

    const inputDefs = this.engine.inputDefinition
    const outputDefs = this.engine.outputDefinition
    const inKeys = Object.keys(inputDefs)
    const outKeys = Object.keys(outputDefs)
    const maxRows = Math.max(inKeys.length, outKeys.length)

    const currentSignature = `${inKeys.join(',')}:${outKeys.join(',')}`

    // 1. If port signature changed or DOM not built, rebuild DOM
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
        <div class="node-header">
          <div class="subgraph-header" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
            <div class="header-left" style="display: flex; align-items: center; gap: 6px;">
              <span class="subgraph-icon" style="font-size: 13px;">📦</span>
              <h3 class="header-title" style="margin: 0; font-size: 12px;">${name}</h3>
              <span class="node-count" style="font-size: 10px; color: var(--ui-color-text-muted, #94a3b8); font-family: var(--ui-font-mono, monospace);">(${innerCount})</span>
            </div>
            <ui-button
              size="sm"
              variant="outline"
              class="open-btn"
              style="font-size: 10px;"
              title="Open and edit inner graph"
            >
              Open ⤢
            </ui-button>
          </div>
        </div>
        <div class="node-body">
          <div class="subgraph-name-row" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 10px;">
            <span style="font-size: 10px; color: var(--ui-color-text-muted, #94a3b8);">Name</span>
            <input
              type="text"
              class="subgraph-name-input"
              value="${name}"
              placeholder="Subgraph"
              style="width: 110px; background: rgba(0,0,0,0.35); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: var(--ui-color-text, #f8fafc); font-size: 11px; padding: 2px 6px;"
            />
          </div>
          <div class="port-grid">
            ${rowsHtml}
          </div>
        </div>
      `

      const openBtn = this.querySelector('.open-btn')
      openBtn?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.handleOpen()
      })

      const nameInput = this.querySelector<HTMLInputElement>('.subgraph-name-input')
      if (nameInput) {
        const stopEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress', 'dblclick']
        for (const evt of stopEvents) {
          nameInput.addEventListener(evt, (e) => e.stopPropagation())
        }
        const onNameChange = () => {
          const nextName = nameInput.value.trim() || 'Subgraph'
          const currData = (this.nodeData || this.engine?.data || {}) as SubgraphData
          currData.name = nextName
          ;(this as any)._nodeData = currData
          if (this.engine) {
            ;(this.engine.data as SubgraphData).name = nextName
          }
          const titleEl = this.querySelector('.header-title')
          if (titleEl) titleEl.textContent = nextName
          this.dispatchEvent(
            new CustomEvent('node-data-change', {
              detail: { id: this.id, data: currData, name: nextName },
              bubbles: true,
              composed: true,
            }),
          )
        }
        nameInput.addEventListener('input', onNameChange)
        nameInput.addEventListener('change', onNameChange)
      }
      return
    }

    // 2. Incremental value updates
    const titleEl = this.querySelector('.header-title')
    if (titleEl) titleEl.textContent = name
    const nameInput = this.querySelector<HTMLInputElement>('.subgraph-name-input')
    if (nameInput && document.activeElement !== nameInput && nameInput.value !== name) {
      nameInput.value = name
    }
    const countEl = this.querySelector('.node-count')
    if (countEl) countEl.textContent = `(${innerCount})`

    inKeys.forEach((key) => {
      const inVal = this.engine?.getInput(key)
      const portEl = this.querySelector(`axon-port-in[data-port-name="${key}"] .in-val-preview`)
      if (portEl) portEl.textContent = formatValue(inVal)
    })

    outKeys.forEach((key) => {
      const outVal = this.engine?.getOutput(key)
      const portEl = this.querySelector(`axon-port-out[data-port-name="${key}"] .out-val-preview`)
      if (portEl) portEl.textContent = formatValue(outVal)
    })
  }
}

if (!customElements.get(TAG_NAMES.AXON_SUBGRAPH_NODE)) {
  customElements.define(TAG_NAMES.AXON_SUBGRAPH_NODE, AxonSubgraphNode)
}
