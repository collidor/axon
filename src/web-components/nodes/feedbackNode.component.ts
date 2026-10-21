// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import {
  createFeedbackNode,
  type FeedbackNodeEngine,
  type FeedbackData,
} from '../../nodes/feedback.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import { formatValue } from '../helpers'

export class AxonFeedbackNode extends AxonBaseNodeElement<FeedbackNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): FeedbackNodeEngine {
    const initialData: FeedbackData = options?.initialData ||
      this.nodeData || {
        initial: 0,
        label: 'Feedback Latch',
      }
    return createFeedbackNode({ id: options?.id || this.id, initialData })
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.FEEDBACK
    this.setAttribute('data-node-type', NODE_TYPES.FEEDBACK)
    super.connectedCallback()
  }

  public step(): void {
    if (this.engine) {
      this.engine.step()
      this.render()
    }
  }

  public reset(): void {
    if (this.engine) {
      this.engine.reset()
      this.render()
    }
  }

  render() {
    if (!this.engine) return

    const cur = formatValue(this.engine.state?.currentValue)
    const next = formatValue(this.engine.state?.nextValue)
    const count = this.engine.state?.stepCount ?? 0
    const initialVal = this.engine.data?.initial ?? (this.nodeData as any)?.initial ?? 0

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>Feedback Latch</h3>
          <span class="badge" style="background: var(--ui-color-accent-subtle, rgba(168, 85, 247, 0.2)); color: var(--ui-color-accent, #c084fc); font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Z⁻¹</span>
        </div>
        <div class="node-body">
          <div class="feedback-monitor" style="padding: 6px 12px; display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.15); border-radius: 6px; margin: 4px 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; gap: 6px;">
              <span style="color: var(--ui-color-text-muted, #94a3b8);">Initial:</span>
              <input
                type="number"
                class="feedback-initial-input"
                value="${Number(initialVal) || 0}"
                style="width: 68px; background: rgba(0,0,0,0.4); border: 1px solid var(--ui-color-border, #334155); border-radius: 4px; color: var(--ui-color-text, #f8fafc); font-family: monospace; font-size: 11px; padding: 2px 5px; text-align: right;"
              />
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="color: var(--ui-color-text-muted, #94a3b8);">Current:</span>
              <strong class="feedback-cur-val" style="color: var(--ui-color-accent, #c084fc); font-family: monospace;">${cur}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="color: var(--ui-color-text-muted, #94a3b8);">Staged Next:</span>
              <span class="feedback-next-val" style="color: var(--ui-color-text-dim, #cbd5e1); font-family: monospace;">${next}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: var(--ui-color-text-muted, #64748b);">
              <span>Cycle Count:</span>
              <span class="feedback-count">${count}</span>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 4px;">
              <button type="button" class="feedback-btn-step" style="flex: 1; padding: 3px 6px; font-size: 10px; font-weight: 600; background: var(--ui-color-primary, #3b82f6); color: white; border: none; border-radius: 4px; cursor: pointer;">Step</button>
              <button type="button" class="feedback-btn-reset" style="padding: 3px 6px; font-size: 10px; font-weight: 600; background: transparent; border: 1px solid var(--ui-color-border, #475569); color: var(--ui-color-text, #e2e8f0); border-radius: 4px; cursor: pointer;">Reset</button>
            </div>
          </div>
          <div class="port-grid">
            <div class="port-column inputs">
              <axon-port-in
                id="${this.engine.getPortId('input')}"
                data-type="any"
                class="port input"
              >
                <span class="port-label">In</span>
              </axon-port-in>
              <axon-port-in
                id="${this.engine.getPortId('step')}"
                data-type="boolean"
                class="port input"
              >
                <span class="port-label">Step</span>
              </axon-port-in>
              <axon-port-in
                id="${this.engine.getPortId('reset')}"
                data-type="boolean"
                class="port input"
              >
                <span class="port-label">Reset</span>
              </axon-port-in>
            </div>
            <div class="port-column outputs">
              <axon-port-out
                id="${this.engine.getPortId('output')}"
                data-type="any"
                class="port output"
                style="--port-color: var(--ui-color-accent, #c084fc);"
              >
                <span class="port-label">Out</span>
              </axon-port-out>
              <axon-port-out
                id="${this.engine.getPortId('previous')}"
                data-type="any"
                class="port output"
              >
                <span class="port-label">Prev</span>
              </axon-port-out>
            </div>
          </div>
        </div>
      `

      const initInput = this.querySelector<HTMLInputElement>('.feedback-initial-input')
      if (initInput) {
        const stopEvents = ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup', 'keypress']
        for (const evt of stopEvents) {
          initInput.addEventListener(evt, (e) => e.stopPropagation())
        }
        const onInitChange = () => {
          const parsed = Number(initInput.value)
          const val = Number.isNaN(parsed) ? 0 : parsed
          const currData = this.nodeData || (this.engine as any)?.data || {}
          currData.initial = val
          ;(this as any)._nodeData = currData
          if (this.engine) {
            this.engine.data.initial = val
          }
          this.dispatchEvent(
            new CustomEvent('node-data-change', {
              detail: { id: this.id, data: currData, initial: val },
              bubbles: true,
              composed: true,
            }),
          )
        }
        initInput.addEventListener('input', onInitChange)
        initInput.addEventListener('change', onInitChange)
      }

      this.querySelector('.feedback-btn-step')?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.step()
      })

      this.querySelector('.feedback-btn-reset')?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.reset()
      })
    } else {
      const curEl = this.querySelector('.feedback-cur-val')
      if (curEl) curEl.textContent = cur

      const nextEl = this.querySelector('.feedback-next-val')
      if (nextEl) nextEl.textContent = next

      const countEl = this.querySelector('.feedback-count')
      if (countEl) countEl.textContent = String(count)

      const initInput = this.querySelector<HTMLInputElement>('.feedback-initial-input')
      if (initInput && document.activeElement !== initInput) {
        initInput.value = String(Number(initialVal) || 0)
      }
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_FEEDBACK_NODE)) {
  customElements.define(TAG_NAMES.AXON_FEEDBACK_NODE, AxonFeedbackNode)
}
