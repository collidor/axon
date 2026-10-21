import { AxonBox } from '../axonBox.component'
import { TAG_NAMES, type AxonGraphType } from '../constants'
import type { BaseNode } from '../../core/base.node'

/**
 * Base custom element for Axon Web Component nodes.
 * Bridges a BaseNode engine with custom element lifecycle,
 * subscriptions, port management, and DOM rendering.
 */
export abstract class AxonBaseNodeElement<T extends BaseNode = BaseNode> extends AxonBox {
  protected graph: AxonGraphType | null = null
  public engine: T | null = null

  private unsubInput: (() => void) | null = null
  private unsubOutput: (() => void) | null = null
  private unsubStatus: (() => void) | null = null
  private connectedPorts = new Set<string>()

  // oxlint-disable-next-line typescript/no-explicit-any
  abstract createEngine(options?: { id?: string; initialData?: any }): T
  abstract render(): void

  // oxlint-disable-next-line typescript/no-explicit-any
  override get nodeData(): any {
    return super.nodeData
  }
  // oxlint-disable-next-line typescript/no-explicit-any
  override set nodeData(val: any) {
    super.nodeData = val
    if (this.engine && val) {
      // oxlint-disable-next-line typescript/no-explicit-any
      ;(this.engine as any).data = val
    }
    this.render()
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  override get data(): any {
    return this.nodeData
  }
  // oxlint-disable-next-line typescript/no-explicit-any
  override set data(val: any) {
    this.nodeData = val
  }

  get isNodeConnected(): boolean {
    return this.engine !== null
  }

  isPortConnected(portName: string): boolean {
    const portId = this.engine?.getPortId(portName) ?? `${this.id}:${portName}`
    if (portId && this.connectedPorts.has(portId)) return true
    const parentGraph = this.graph || (this.closest(TAG_NAMES.AXON_GRAPH) as AxonGraphType | null)
    if (parentGraph && portId) {
      if (typeof parentGraph.isPortConnected === 'function' && parentGraph.isPortConnected(portId)) {
        return true
      }
      if (Array.isArray(parentGraph.edges)) {
        return parentGraph.edges.some(
          (edge: any) =>
            edge.to === portId ||
            edge.from === portId ||
            edge.getAttribute?.('to') === portId ||
            edge.getAttribute?.('from') === portId ||
            edge.toPort?.id === portId ||
            edge.fromPort?.id === portId,
        )
      }
    }
    return false
  }

  connectedCallback() {
    super.connectedCallback()
    this.classList.add('axon-node-card')
    this.setAttribute('data-axon-node', 'true')

    this.graph = this.closest(TAG_NAMES.AXON_GRAPH) as AxonGraphType | null

    this.initEngine()
    this.setupPortListeners()
    this.render()
  }

  protected initEngine() {
    if (!this.graph) {
      if (!this.engine) {
        this.engine = this.createEngine({ id: this.id || undefined, initialData: this.nodeData })
        if (!this.id) this.id = this.engine.id
      }
      this.bindSubscriptions()
      return
    }

    const existing = this.id
      ? (this.graph.getEngine()?.getNode(this.id) as T | undefined)
      : undefined

    if (existing) {
      this.engine = existing
    } else {
      this.engine = this.createEngine({ id: this.id || undefined, initialData: this.nodeData })
      if (!this.id) {
        this.id = this.engine.id
      }
      this.graph.addNode(this.engine)
    }

    this.bindSubscriptions()
  }

  public bindSubscriptions() {
    if (!this.engine) return

    this.unsubInput?.()
    this.unsubOutput?.()
    this.unsubStatus?.()

    this.unsubInput = this.engine.subscribeInput((name, val) => {
      this.onInputUpdate(name as string, val)
    })

    this.unsubOutput = this.engine.subscribe((name, val) => {
      this.onOutputUpdate(name as string, val)
    })

    this.unsubStatus = this.engine.subscribeStatus?.((status, progress, error) => {
      this.onStatusUpdate(status, progress, error)
    }) ?? null
  }

  private setupPortListeners() {
    this.addEventListener('port-connected', (e) => {
      const port = e.target as HTMLElement
      if (port && port.id) {
        if (!this.connectedPorts.has(port.id)) {
          this.connectedPorts.add(port.id)
          this.onPortConnected(port.id)
        }
      }
    })

    this.addEventListener('port-disconnected', (e) => {
      const port = e.target as HTMLElement
      if (port && port.id) {
        if (this.connectedPorts.has(port.id)) {
          this.connectedPorts.delete(port.id)
          this.onPortDisconnected(port.id)
        }
      }
    })
  }

  protected onPortConnected(_portId: string) {
    this.render()
  }

  protected onPortDisconnected(_portId: string) {
    this.render()
  }

  protected onInputUpdate(_name: string, _value: unknown) {
    // Default no-op. Subclasses that display live incoming values (such as AxonDisplayNode) override this.
  }

  protected onOutputUpdate(_name: string, _value: unknown) {
    // Default no-op. Subclasses that display live outgoing values override this.
  }

  protected onStatusUpdate(status: string, _progress: number, _error?: unknown) {
    this.setAttribute('data-status', status)
    this.classList.toggle('status-running', status === 'running')
    this.classList.toggle('status-resolved', status === 'resolved')
    this.classList.toggle('status-rejected', status === 'rejected')
    if (status === 'running') {
      this.classList.add('is-streaming')
    } else {
      this.classList.remove('is-streaming')
    }
  }

  setInput(name: string, value: unknown) {
    this.engine?.setInput(name, value)
  }

  isPortWired(portName: string): boolean {
    // oxlint-disable-next-line typescript/no-explicit-any
    const portId = this.engine ? this.engine.getPortId(portName as any) : `${this.id || ''}:${portName}`
    if (this.connectedPorts.has(portId)) return true
    // oxlint-disable-next-line typescript/no-explicit-any
    const graphEl = this.graph || (this.closest('axon-graph') as any)
    if (graphEl?.edges && Array.isArray(graphEl.edges)) {
      // oxlint-disable-next-line typescript/no-explicit-any
      return graphEl.edges.some((e: any) => e.to === portId || e.toPort?.id === portId)
    }
    return false
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.unsubInput?.()
    this.unsubOutput?.()
    this.unsubStatus?.()
    this.unsubInput = null
    this.unsubOutput = null
    this.unsubStatus = null

    if (this.engine) {
      this.engine.destroy()
    }
  }
}
