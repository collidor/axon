import {
  AXON_PORT,
  type AxonBoxType,
  type AxonGraphType,
  type AxonPortBaseType,
  TAG_NAMES,
  BOX_SELECTOR,
} from './constants'

export class AxonPort extends HTMLElement implements AxonPortBaseType {
  readonly [AXON_PORT] = true as const

  box!: AxonBoxType
  graph!: AxonGraphType
  public direction: 'in' | 'out' = 'in'

  get dataType(): string | null {
    return this.getAttribute('data-type')
  }

  connectedCallback() {
    this.box = this.closest(BOX_SELECTOR) as AxonBoxType
    this.graph = this.closest(TAG_NAMES.AXON_GRAPH) as AxonGraphType

    if (this.graph && this.box && this.id) {
      this.graph.registerPort(this.box.id, this.id, this.direction)
      // Notify the graph that a new port is available in the DOM.
      // The graph uses this to rebuild adjacency reactively instead of via a static timer.
      this.dispatchEvent(
        new CustomEvent('axon-port-registered', {
          bubbles: true,
          composed: true,
          detail: { portId: this.id, direction: this.direction },
        }),
      )
    }
  }

  onConnected() {
    this.dispatchEvent(new CustomEvent('port-connected', { bubbles: true }))
  }

  onDisconnected() {
    this.dispatchEvent(new CustomEvent('port-disconnected', { bubbles: true }))
  }
}

export class AxonPortIn extends AxonPort {
  override direction: 'in' = 'in'

  onValueUpdate(value: unknown) {
    this.dispatchEvent(new CustomEvent('value-update', { detail: value, bubbles: true }))
  }
}

export class AxonPortOut extends AxonPort {
  override direction: 'out' = 'out'

  setValue(value: unknown) {
    this.graph?.setPortValue(this.id, value)
  }
}

if (!customElements.get(TAG_NAMES.AXON_PORT_IN)) {
  customElements.define(TAG_NAMES.AXON_PORT_IN, AxonPortIn)
}

if (!customElements.get(TAG_NAMES.AXON_PORT_OUT)) {
  customElements.define(TAG_NAMES.AXON_PORT_OUT, AxonPortOut)
}
