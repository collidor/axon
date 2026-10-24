// oxlint-disable typescript/no-explicit-any
import {
  AXON_GRAPH,
  type AxonBoxType,
  type AxonEdgeType,
  type AxonGraphType,
  type AxonPortBaseType,
  type LayoutEngine,
  type Offset,
  type Point,
  TAG_NAMES,
  BOX_SELECTOR,
} from './constants'
import { isAxonBox, isAxonPort, isBaseNode, escapePortId, resolveNodeTagName } from './helpers'
import { SelectionManager } from '../systems/selectionManager'
import { BaseGraph } from '../core/base.graph'
import type { SerializedGraph, SerializedNode, SerializedEdge } from '../core/serialization'
import style from './axon.css?inline'
import { TickEngine } from '../systems/tickEngine.system'
import { ViewportTransformSystem } from '../systems/viewportTransform.system'
import { MagneticDAGEngine } from '../systems/magneticDAGEngine.system'
import { Command, COMMAND_RETURN, CommandBus, type CommandHistoryManager } from '@collidor/command'
import {
  AddNodeCommand,
  RemoveNodeCommand,
  MoveNodeCommand,
  UpdateNodeDataCommand,
  AddEdgeCommand,
  RemoveEdgeCommand,
  DuplicateNodeCommand,
  SetGraphCommand,
} from '../commands/graphCommands'
import {
  GraphViewportController,
  GraphConnectionController,
  GraphSelectionController,
  GraphEdgeRenderer,
  GraphAdjacencyManager,
} from './graph/index'

/**
 * Root custom element for the interactive visual node graph canvas.
 * Orchestrates viewport transformations, port connections, selection gestures,
 * edge rendering, and the command pipeline via specialized domain controllers.
 */
export class AxonGraph extends HTMLElement implements AxonGraphType {
  readonly [AXON_GRAPH] = true as const

  public static isInteractiveControl(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Element)) return false
    return Boolean(
      target.closest(
        'input, select, textarea, button, a, [contenteditable="true"], [contenteditable=""], [data-interactive], ui-input, ui-number-input, ui-select, ui-switch, ui-button, ui-dialog, .port-slot, .event-controls, .dialog-control, .form-control, .node-controls',
      ),
    )
  }

  public selectionManager: SelectionManager = new SelectionManager({
    mode: 'multiple',
    root: this,
    resolveElement: (id) => (!id ? null : this.queryScoped(`#${escapePortId(id)}`)),
    host: this,
  })

  #engine = new BaseGraph()
  #layoutEngine: LayoutEngine | null = null
  #resizeObserver: ResizeObserver | null = null
  #observedBoxes: Set<Element> = new Set()
  #stateUpdateThrottled = false
  #observer: MutationObserver | null = null
  #unsubs: (() => void)[] = []
  #isConnected = false
  #isLayoutSettling = false
  #pendingAutoZoomPadding: number | null = null
  #tickCleanup: (() => void) | null = null
  #hasRunInitialLayout = false
  #autoSort = true
  #snapEnabled = false
  #dragMode: 'pan' | 'box-select' = 'pan'
  #activeAnimations = 0
  #activeDraggedBox: AxonBoxType | null = null
  #rafId: number | null = null

  declare shadowRoot: ShadowRoot
  svg!: SVGSVGElement
  vp!: HTMLDivElement
  selBox!: HTMLDivElement

  tickEngine: TickEngine = new TickEngine()
  viewportTransform: ViewportTransformSystem = new ViewportTransformSystem()
  public readonly commandBus: CommandBus = new CommandBus()
  public historyManager: CommandHistoryManager | null = null

  public viewportController!: GraphViewportController
  public connectionController!: GraphConnectionController
  public selectionController!: GraphSelectionController
  public edgeRenderer!: GraphEdgeRenderer
  public adjacencyManager!: GraphAdjacencyManager

  classNames = {
    isInteracting: 'is-interacting',
  }

  // --- Attribute Observers ---
  static get observedAttributes(): string[] {
    return [
      'snapenabled',
      'is-selected-class',
      'autosort',
      'auto-sort',
      'column-width',
      'columnwidth',
      'dragmode',
      'drag-mode',
    ]
  }

  attributeChange: Record<string, (value: string) => void> = {
    dragmode: (value: string) => {
      this.dragMode = value === 'box-select' ? 'box-select' : 'pan'
    },
    'drag-mode': (value: string) => {
      this.dragMode = value === 'box-select' ? 'box-select' : 'pan'
    },
    snapenabled: (value: string) => {
      this.snapEnabled = value !== 'false'
    },
    'is-selected-class': (value: string) => {
      this.selectionManager.classNames.isSelected = value
    },
    autosort: (value: string) => {
      this.autoSort = value !== 'false'
    },
    'auto-sort': (value: string) => {
      this.autoSort = value !== 'false'
    },
    'column-width': (value: string) => {
      const val = parseFloat(value)
      if (val > 0) this.columnWidth = val
    },
    columnwidth: (value: string) => {
      const val = parseFloat(value)
      if (val > 0) this.columnWidth = val
    },
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (oldValue === newValue) return
    if (this.attributeChange[name]) this.attributeChange[name](newValue)
  }

  // --- Public Properties & Accessors ---
  get dragMode(): 'pan' | 'box-select' {
    return this.#dragMode
  }

  set dragMode(mode: 'pan' | 'box-select') {
    this.#dragMode = mode
  }

  get boxSelectMode(): boolean {
    return this.#dragMode === 'box-select'
  }

  set boxSelectMode(val: boolean) {
    this.#dragMode = val ? 'box-select' : 'pan'
  }

  public get snapEnabled(): boolean {
    return this.#snapEnabled
  }

  public set snapEnabled(value: boolean) {
    this.#snapEnabled = value
  }

  public get autoSort(): boolean {
    return this.#autoSort
  }

  public set autoSort(value: boolean) {
    const newVal = Boolean(value)
    if (this.#autoSort === newVal) return
    this.#autoSort = newVal
    if (this.#autoSort && this.layoutEngine) {
      this.syncEngineLayout(true)
    }
  }

  public get columnWidth(): number {
    return this.layoutEngine?.columnWidth ?? 300
  }

  public set columnWidth(value: number) {
    const val = Number(value)
    if (val <= 0) return
    if (this.layoutEngine) {
      this.layoutEngine.columnWidth = val
      if (this.#autoSort) {
        this.syncEngineLayout(false)
        this.requestDraw()
      }
    }
  }

  public get layoutEngine(): LayoutEngine | null {
    return this.#layoutEngine
  }

  public set layoutEngine(engine: LayoutEngine | null) {
    this.#layoutEngine = engine
    if (engine) {
      const hasNodes = this.queryScopedAll(BOX_SELECTOR).length > 0
      if (hasNodes && !this.#hasRunInitialLayout) {
        this.syncEngineLayout(true)
        this.#hasRunInitialLayout = true
      } else {
        this.syncEngineLayout(false)
      }
    }
  }

  public get engine(): BaseGraph {
    return this.#engine
  }

  public set engine(newEngine: BaseGraph) {
    this.setEngine(newEngine)
  }

  public getEngine(): BaseGraph {
    return this.#engine
  }

  public setEngine(newEngine: BaseGraph): void {
    if (this.#engine === newEngine) return
    this.#engine = newEngine
    this.#setupEngineSubscriptions()
    this.queryScopedAll<AxonBoxType>(BOX_SELECTOR).forEach((box) => {
      const nodeEngine = (box as any).engine
      if (nodeEngine && isBaseNode(nodeEngine)) {
        const existingNodeInNewEngine = newEngine.getNode(nodeEngine.id)
        if (!existingNodeInNewEngine) {
          newEngine.addNode(nodeEngine)
        } else if (existingNodeInNewEngine !== nodeEngine) {
          ;(box as any).engine = existingNodeInNewEngine
          if ('bindSubscriptions' in box && typeof (box as any).bindSubscriptions === 'function') {
            ;(box as any).bindSubscriptions()
          }
          if ('render' in box && typeof (box as any).render === 'function') {
            ;(box as any).render()
          }
        }
      }
    })
    this.rebuildAdjacency()
    this.requestDraw()
  }

  get edges(): AxonEdgeType[] {
    return this.adjacencyManager ? this.adjacencyManager.cachedEdges : []
  }

  get edgeMap(): Map<AxonEdgeType, SVGGElement> {
    return this.edgeRenderer ? this.edgeRenderer.edgeMap : new Map()
  }

  // --- Scoped Query Helpers ---
  public queryScopedAll<T extends Element>(selector: string): T[] {
    if (!selector || selector === '#') return []
    try {
      return Array.from(this.querySelectorAll<T>(selector)).filter((el) => {
        const parentGraph = el.closest(TAG_NAMES.AXON_GRAPH)
        return parentGraph === this
      })
    } catch {
      return []
    }
  }

  public queryScoped<T extends Element>(selector: string): T | null {
    if (!selector || selector === '#') return null
    try {
      return (
        Array.from(this.querySelectorAll<T>(selector)).find((el) => {
          const parentGraph = el.closest(TAG_NAMES.AXON_GRAPH)
          return parentGraph === this
        }) || null
      )
    } catch {
      return null
    }
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.adjacencyManager = new GraphAdjacencyManager(this as any)
    this.edgeRenderer = new GraphEdgeRenderer(this as any)
    this.connectionController = new GraphConnectionController(this as any)
    this.#setupEngineSubscriptions()
    this.#setupCommandHandlers()
  }

  // --- Command Pipeline Registration ---
  #setupCommandHandlers(): void {
    this.commandBus.register(AddNodeCommand, (cmd: AddNodeCommand) => {
      const existing = this.queryScoped(`#${cmd.data.node.id}`)
      if (!existing) {
        const tag = resolveNodeTagName(cmd.data.node.type)
        const el = document.createElement(tag)
        el.id = cmd.data.node.id
        el.setAttribute('data-node-type', cmd.data.node.type)
        el.setAttribute('data-axon-node', '')
        ;(el as any).axonNodeType = cmd.data.node.type
        ;(el as any).x = cmd.data.node.x
        ;(el as any).y = cmd.data.node.y
        if (cmd.data.node.data) {
          ;(el as any).nodeData = { ...cmd.data.node.data }
          ;(el as any).data = { ...cmd.data.node.data }
        }
        this.appendChild(el)
      }
      if (cmd.data.edges) {
        cmd.data.edges.forEach((edge: SerializedEdge) => {
          const edgeEl = document.createElement(TAG_NAMES.AXON_EDGE)
          edgeEl.setAttribute('from', edge.from)
          edgeEl.setAttribute('to', edge.to)
          this.appendChild(edgeEl)
        })
      }
      this.rebuildAdjacency()
      this.requestDraw()
      return cmd.data.node
    })

    this.commandBus.register(RemoveNodeCommand, (cmd: RemoveNodeCommand) => {
      const box = this.queryScoped(`#${cmd.data.nodeId}`)
      if (box) {
        box.remove()
      }
      this.#engine.unregisterNode(cmd.data.nodeId)
      this.queryScopedAll<AxonEdgeType>(TAG_NAMES.AXON_EDGE).forEach((edge) => {
        const from = edge.getAttribute('from') || ''
        const to = edge.getAttribute('to') || ''
        if (from.startsWith(`${cmd.data.nodeId}:`) || to.startsWith(`${cmd.data.nodeId}:`)) {
          edge.remove()
        }
      })
      this.rebuildAdjacency()
      this.requestDraw()
      return true
    })

    this.commandBus.register(MoveNodeCommand, (cmd: MoveNodeCommand) => {
      const box = this.queryScoped<AxonBoxType>(`#${cmd.data.nodeId}`)
      if (box && 'moveTo' in box) {
        box.moveTo(cmd.data.toX, cmd.data.toY)
        this.requestDraw()
        return true
      }
      return false
    })

    this.commandBus.register(AddEdgeCommand, (cmd: AddEdgeCommand) => {
      // Input ports can have only ONE incoming connection
      const existingInEdges = this.queryScopedAll<AxonEdgeType>(
        `${TAG_NAMES.AXON_EDGE}[to="${cmd.data.edge.to}"]`,
      )
      existingInEdges.forEach((e) => {
        const prevFrom = e.getAttribute('from') || ''
        if (prevFrom !== cmd.data.edge.from) {
          e.remove()
          this.#engine.removeEdge(prevFrom, cmd.data.edge.to)
          this.dispatchEvent(
            new CustomEvent('edge-disconnected', {
              detail: {
                edge: { from: prevFrom, to: cmd.data.edge.to },
                from: prevFrom,
                to: cmd.data.edge.to,
              },
              bubbles: true,
            }),
          )
        }
      })

      // Duplicate protection
      const duplicate = this.queryScoped(
        `${TAG_NAMES.AXON_EDGE}[from="${cmd.data.edge.from}"][to="${cmd.data.edge.to}"]`,
      )
      if (duplicate) {
        return cmd.data.edge
      }

      const edge = document.createElement(TAG_NAMES.AXON_EDGE)
      edge.setAttribute('from', cmd.data.edge.from)
      edge.setAttribute('to', cmd.data.edge.to)
      this.appendChild(edge)
      this.#engine.addEdge(cmd.data.edge.from, cmd.data.edge.to)
      this.rebuildAdjacency()
      this.requestDraw()
      this.dispatchEvent(
        new CustomEvent('edge-connected', {
          detail: { edge: cmd.data.edge, from: cmd.data.edge.from, to: cmd.data.edge.to },
          bubbles: true,
        }),
      )
      return cmd.data.edge
    })

    this.commandBus.register(RemoveEdgeCommand, (cmd: RemoveEdgeCommand) => {
      const edge = this.queryScoped(
        `${TAG_NAMES.AXON_EDGE}[from="${cmd.data.edge.from}"][to="${cmd.data.edge.to}"]`,
      )
      if (edge) {
        edge.remove()
        this.#engine.removeEdge(cmd.data.edge.from, cmd.data.edge.to)
        this.rebuildAdjacency()
        this.requestDraw()
        this.dispatchEvent(
          new CustomEvent('edge-disconnected', {
            detail: { edge: cmd.data.edge, from: cmd.data.edge.from, to: cmd.data.edge.to },
            bubbles: true,
          }),
        )
        return true
      }
      return false
    })

    this.commandBus.register(UpdateNodeDataCommand, (cmd: UpdateNodeDataCommand) => {
      const box = this.queryScoped(`#${cmd.data.nodeId}`)
      if (box && 'engine' in box && (box as any).engine) {
        const engine = (box as any).engine
        if (typeof engine.updateData === 'function') {
          engine.updateData(cmd.data.data)
        } else {
          engine.data = { ...cmd.data.data }
        }
        ;(box as any).nodeData = { ...cmd.data.data }
        ;(box as any).data = { ...cmd.data.data }
        this.dispatchEvent(
          new CustomEvent('axon-node-data-updated', {
            bubbles: true,
            composed: true,
            detail: {
              nodeId: cmd.data.nodeId,
              data: cmd.data.data,
              prevData: cmd.data.prevData,
            },
          }),
        )
        return true
      }
      return false
    })

    this.commandBus.register(DuplicateNodeCommand, (cmd: DuplicateNodeCommand) => {
      const tag = resolveNodeTagName(cmd.data.clonedNode.type)
      const el = document.createElement(tag)
      el.id = cmd.data.clonedNode.id
      el.setAttribute('data-node-type', cmd.data.clonedNode.type)
      el.setAttribute('data-axon-node', '')
      ;(el as any).axonNodeType = cmd.data.clonedNode.type
      ;(el as any).x = cmd.data.clonedNode.x
      ;(el as any).y = cmd.data.clonedNode.y
      if (cmd.data.clonedNode.data) {
        ;(el as any).nodeData = { ...cmd.data.clonedNode.data }
        ;(el as any).data = { ...cmd.data.clonedNode.data }
      }
      this.appendChild(el)
      this.rebuildAdjacency()
      this.requestDraw()
      return cmd.data.clonedNode
    })

    this.commandBus.register(SetGraphCommand, (cmd: SetGraphCommand) => {
      this.queryScopedAll<AxonEdgeType>(TAG_NAMES.AXON_EDGE).forEach((e) => e.remove())
      this.queryScopedAll(BOX_SELECTOR).forEach((b) => {
        if (b.id) {
          this.#engine.unregisterNode(b.id)
        }
        b.remove()
      })
      if (this.adjacencyManager) {
        this.adjacencyManager.connectedPorts.clear()
      }
      this.#engine.clearEdges()

      const nodes = cmd.data.graph?.nodes || []
      nodes.forEach((n: SerializedNode) => {
        const tag = resolveNodeTagName(n.type)
        const el = document.createElement(tag)
        el.id = n.id
        el.setAttribute('data-node-type', n.type)
        el.setAttribute('data-axon-node', '')
        ;(el as any).axonNodeType = n.type
        ;(el as any).x = n.x
        ;(el as any).y = n.y
        if (n.data) {
          ;(el as any).nodeData = { ...n.data }
          ;(el as any).data = { ...n.data }
        }
        this.appendChild(el)
      })

      const edges = cmd.data.graph?.edges || []
      edges.forEach((e: SerializedEdge) => {
        const edgeEl = document.createElement(TAG_NAMES.AXON_EDGE)
        edgeEl.setAttribute('from', e.from)
        edgeEl.setAttribute('to', e.to)
        this.appendChild(edgeEl)
      })

      this.resolveVerticalOverlaps()
      this.rebuildAdjacency()
      this.requestDraw()
      return true
    })
  }

  public executeCommand<C extends Command, I extends Command>(
    forward: C,
    inverse: I,
    description?: string,
  ): C[typeof COMMAND_RETURN] {
    if (this.historyManager) {
      return this.historyManager.execute(forward, inverse, {
        bus: this.commandBus,
        source: 'axon-graph',
        description,
      })
    } else {
      return this.commandBus.execute(forward)
    }
  }

  // --- Engine Subscriptions ---
  #setupEngineSubscriptions(): void {
    this.#unsubs.forEach((unsub) => unsub())
    this.#unsubs = []

    this.#unsubs.push(
      this.#engine.onPulse((fromId, toId) => {
        const edge = this.queryScoped(
          `${TAG_NAMES.AXON_EDGE}[from="${fromId}"][to="${toId}"]`,
        ) as unknown as AxonEdgeType
        if (edge) {
          this.triggerEdgePulse(edge)
        }
      }),
    )

    this.#unsubs.push(
      this.#engine.onPortValueChange((id, value) => {
        const port = this.queryScoped('#' + escapePortId(id))
        if (port && isAxonPort(port, 'in')) {
          port.onValueUpdate?.(value)
        }
      }),
    )
  }

  triggerEdgePulse(edge: AxonEdgeType): void {
    if (edge.pulseCleanup) {
      edge.pulseCleanup()
      edge.pulseCleanup = null
    } else {
      this.#activeAnimations++
    }

    edge.pulseIntensity = 1.0
    this.requestDraw()

    edge.pulseCleanup = this.tickEngine.addTickCallback({
      callback: (dt) => {
        if (edge.pulseIntensity === undefined) return
        edge.pulseIntensity -= (edge.pulseIntensity * dt) / 250
        if (edge.pulseIntensity <= 0.01) {
          edge.pulseIntensity = 0
          if (edge.pulseCleanup) {
            edge.pulseCleanup()
            edge.pulseCleanup = null
          }
          this.#activeAnimations = Math.max(0, this.#activeAnimations - 1)
        }
        this.requestDraw()
      },
    })
  }

  getPortValue(id: string): unknown {
    return this.#engine.getPortValue(id)
  }

  setPortValue(id: string, value: unknown): void {
    this.#engine.setPortValue(id, value)
    void this.#engine.settle()
  }

  registerPort(nodeId: string, portId: string, direction?: 'in' | 'out'): void {
    this.#engine.registerPort(nodeId, portId, direction)
  }

  isPortConnected(portId: string): boolean {
    return this.adjacencyManager ? this.adjacencyManager.connectedPorts.has(portId) : false
  }

  serialize(): SerializedGraph {
    const nodes: SerializedNode[] = []
    this.queryScopedAll<AxonBoxType>(BOX_SELECTOR).forEach((box) => {
      if (isAxonBox(box)) {
        const engineNode = this.#engine.getNode(box.id)
        const type =
          box.getAttribute('data-node-type') ||
          (engineNode as any)?.nodeType ||
          (engineNode as any)?.type ||
          box.tagName.toLowerCase().replace(/^axon-/, '').replace(/-node$/, '') ||
          'unknown'
        nodes.push({
          id: box.id,
          type,
          x: box.x,
          y: box.y,
          data: engineNode?.data ? JSON.parse(JSON.stringify(engineNode.data)) : box.nodeData || {},
        })
      }
    })

    const edges: SerializedEdge[] = []
    this.queryScopedAll(TAG_NAMES.AXON_EDGE).forEach((el) => {
      const edge = el as unknown as AxonEdgeType
      const from = edge.getAttribute('from')
      const to = edge.getAttribute('to')
      if (from && to) {
        edges.push({ from, to })
      }
    })

    return {
      nodes,
      edges,
      zoom: this.viewportTransform.serialize(),
    }
  }

  #scheduleAdjacency(): void {
    this.adjacencyManager?.scheduleAdjacency(() => {
      if (!this.#isConnected) return
      this.rebuildAdjacency()

      if (this.layoutEngine && this.#autoSort && !this.#hasRunInitialLayout) {
        const boxes = this.queryScopedAll<AxonBoxType>(BOX_SELECTOR)
        if (boxes.length > 0) {
          this.syncEngineLayout(true)
          this.#hasRunInitialLayout = true
        }
      }

      if (this.#pendingAutoZoomPadding !== null) {
        const pad = this.#pendingAutoZoomPadding
        this.#pendingAutoZoomPadding = null
        this.autoZoom(pad)
      } else {
        this.updateView()
      }

      this.requestDraw()
    })
  }

  loadEdges(edges: SerializedEdge[]): void {
    const existingEdges = this.queryScopedAll<AxonEdgeType>(TAG_NAMES.AXON_EDGE)
    const existingPairs = new Set(
      existingEdges.map((e) => `${e.getAttribute('from')}-${e.getAttribute('to')}`),
    )
    const targetPairs = new Set(edges.map((e) => `${e.from}-${e.to}`))

    existingEdges.forEach((el) => {
      const pair = `${el.getAttribute('from')}-${el.getAttribute('to')}`
      if (!targetPairs.has(pair)) {
        el.remove()
      }
    })

    edges.forEach((edgeData) => {
      const pair = `${edgeData.from}-${edgeData.to}`
      if (!existingPairs.has(pair)) {
        const edge = document.createElement(TAG_NAMES.AXON_EDGE)
        edge.setAttribute('from', edgeData.from)
        edge.setAttribute('to', edgeData.to)
        this.appendChild(edge)
      }
    })

    this.#scheduleAdjacency()
  }

  load(data: SerializedGraph): void {
    if (data.zoom) this.viewportTransform.load(data.zoom)
    this.updateView()
    this.loadEdges(data.edges)

    if (this.#autoSort && this.layoutEngine) {
      const boxes = this.queryScopedAll<AxonBoxType>(BOX_SELECTOR)
      if (boxes.length > 0) {
        this.syncEngineLayout(true)
        this.#hasRunInitialLayout = true
      }
    }
  }

  loadGraph(graph: SerializedGraph, undoable: boolean = true): void {
    const forward = new SetGraphCommand({ graph })
    if (undoable) {
      const current = this.serialize()
      const inverse = new SetGraphCommand({ graph: current })
      this.executeCommand(forward, inverse, 'Load Graph')
    } else {
      this.commandBus.execute(forward)
    }
  }

  clear(undoable: boolean = true): void {
    this.loadGraph({ nodes: [], edges: [] }, undoable)
  }

  addNode(node: unknown): void {
    if (!isBaseNode(node)) return
    if (this.#engine.getNode(node.id) !== node) {
      this.#engine.addNode(node)
    }
    this.updateState()
    void this.#engine.settle()
  }

  /**
   * Spawns a new node of the given type at the specified coordinates,
   * dispatches the AddNodeCommand (with undo history if enabled), and selects the node.
   */
  public spawnNode(
    type: string,
    x = 200,
    y = 200,
    data: Record<string, unknown> = {},
    undoable = true,
  ): string {
    const id = `${type}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const fwd = new AddNodeCommand({
      node: { id, type, x, y, data },
    })
    if (undoable && this.historyManager) {
      const inv = new RemoveNodeCommand({ nodeId: id })
      this.executeCommand(fwd, inv, `Add ${type} node`)
    } else {
      this.commandBus.execute(fwd)
    }
    this.selectionManager.clearSelection()
    this.selectionManager.select(id)
    return id
  }

  deleteNode(nodeId: string, undoable: boolean = true): boolean {
    const box = this.queryScoped<AxonBoxType>(`#${nodeId}`)
    const fwd = new RemoveNodeCommand({ nodeId })

    if (undoable && box) {
      const inv = new AddNodeCommand({
        node: {
          id: nodeId,
          type: (box as any).axonNodeType || 'math',
          x: box.x ?? 0,
          y: box.y ?? 0,
          data: (box as any).nodeData || {},
        },
      })
      this.executeCommand(fwd, inv, `Delete ${nodeId}`)
      return true
    }

    return Boolean(this.commandBus.execute(fwd))
  }

  removeNode(nodeId: string): void {
    this.deleteNode(nodeId, false)
  }

  updateState(): void {
    if (!this.#stateUpdateThrottled) {
      this.#stateUpdateThrottled = true
      queueMicrotask(() => {
        this.dispatchEvent(new CustomEvent('state-update'))
        this.#stateUpdateThrottled = false
      })
    }
  }

  rebuildAdjacency(): void {
    if (!this.adjacencyManager || !this.edgeRenderer) return
    this.adjacencyManager.rebuildAdjacency(this.edgeRenderer.edgeMetadata, TAG_NAMES.AXON_EDGE)
  }

  getPortCenter(port: AxonPortBaseType, out: Point): Point {
    const box = port.closest(BOX_SELECTOR) as AxonBoxType | null
    if (!box || !isAxonBox(box)) {
      out.x = 0
      out.y = 0
      return out
    }

    const boxX = (box as any).x ?? parseFloat((box as HTMLElement).style?.left) ?? 0
    const boxY = (box as any).y ?? parseFloat((box as HTMLElement).style?.top) ?? 0
    const isInput = isAxonPort(port, 'in')

    const portRect = port.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    const k = this.viewportTransform.k || 1

    if (boxRect.width > 0 && boxRect.height > 0) {
      const socketDot = (
        port.classList?.contains('edge-socket') || port.classList?.contains('socket-dot')
          ? port
          : port.querySelector?.('.edge-socket, .socket-dot, .port-dot')
      ) as HTMLElement | null

      if (socketDot) {
        const dotRect = socketDot.getBoundingClientRect()
        out.x = boxX + (dotRect.left + dotRect.width / 2 - boxRect.left) / k
        out.y = boxY + (dotRect.top + dotRect.height / 2 - boxRect.top) / k
        return out
      }

      const row = port.closest(
        '.data-node-row, .node-row, .port-row-pair, .port-row-input',
      ) as HTMLElement | null

      if (row) {
        const rowRect = row.getBoundingClientRect()
        const boxWidth = boxRect.width / k
        out.x = boxX + (isInput ? 0 : boxWidth)
        out.y = boxY + (rowRect.top + rowRect.height / 2 - boxRect.top) / k
        return out
      }

      const portWidth = portRect.width / k
      const portHeight = portRect.height / k
      const offsetX = (portRect.left - boxRect.left) / k
      const offsetY = (portRect.top - boxRect.top) / k

      out.x = boxX + offsetX + (isInput ? 0 : portWidth)
      out.y = boxY + offsetY + portHeight / 2
      return out
    }

    const isNodeBox = (box as HTMLElement).offsetWidth || 230
    out.x = boxX + (isInput ? 0 : isNodeBox)
    out.y = boxY + 40
    return out
  }

  findPortAtPoint(
    clientX: number,
    clientY: number,
    maxDistancePx = 24,
    filter?: (port: AxonPortBaseType) => boolean,
  ): AxonPortBaseType | null {
    const rect = this.getBoundingClientRect()
    const k = this.viewportTransform.k || 1
    const tx = this.viewportTransform.x || 0
    const ty = this.viewportTransform.y || 0

    let bestPort: AxonPortBaseType | null = null
    let bestDist = maxDistancePx

    const allPorts = this.queryScopedAll<AxonPortBaseType>(
      `${TAG_NAMES.AXON_PORT_IN}, ${TAG_NAMES.AXON_PORT_OUT}`,
    )

    const tempPoint: Point = { x: 0, y: 0 }
    for (const p of allPorts) {
      if (filter && !filter(p)) continue
      const center = this.getPortCenter(p, tempPoint)
      const screenX = rect.left + (center.x * k + tx)
      const screenY = rect.top + (center.y * k + ty)
      const dist = Math.hypot(clientX - screenX, clientY - screenY)
      if (dist < bestDist) {
        bestDist = dist
        bestPort = p
      }
    }

    return bestPort
  }

  #onWindowResize = () => {
    this.adjacencyManager?.portOffsets.clear()
    this.updateView()
    this.requestDraw()
    if (this.layoutEngine) {
      const rect = this.getBoundingClientRect()
      this.layoutEngine.tickPhysics?.(rect.width, rect.height, [])
    }
  }

  #observeBox(box: Element): void {
    if (this.#observedBoxes.has(box)) return
    this.#observedBoxes.add(box)
    this.#resizeObserver?.observe(box)
  }

  connectedCallback(): void {
    this.#isConnected = true
    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <div id="vp" class="viewport">
        <svg id="svg" class="edges"></svg>
        <slot></slot>
      </div>
      <div id="selBox" class="selection-box"></div>
    `

    this.vp = this.shadowRoot.getElementById('vp') as HTMLDivElement
    this.svg = this.shadowRoot.getElementById('svg') as unknown as SVGSVGElement
    this.selBox = this.shadowRoot.getElementById('selBox') as HTMLDivElement

    // Initialize Domain Controllers
    this.viewportController = new GraphViewportController(this, this.vp, this.viewportTransform)
    this.connectionController = new GraphConnectionController(this as any)
    this.selectionController = new GraphSelectionController(this as any, this.selBox)
    this.edgeRenderer = new GraphEdgeRenderer(this as any)
    this.adjacencyManager = new GraphAdjacencyManager(this as any)

    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => {
        this.adjacencyManager.portOffsets.clear()
        this.updateView()
        this.requestDraw()
      })
      this.#resizeObserver.observe(this)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.#onWindowResize)
    }

    this.queryScopedAll(BOX_SELECTOR).forEach((box) => this.#observeBox(box))

    this.#observer = new MutationObserver(() => {
      this.adjacencyManager.portOffsets.clear()
      this.rebuildAdjacency()

      this.queryScopedAll(BOX_SELECTOR).forEach((box) => this.#observeBox(box))

      if (this.layoutEngine && this.#autoSort) {
        const boxes = this.queryScopedAll<AxonBoxType>(BOX_SELECTOR)
        if (!this.#hasRunInitialLayout && boxes.length > 0) {
          this.syncEngineLayout(true)
          this.#hasRunInitialLayout = true
        } else {
          this.syncEngineLayout(false)
        }
      }
      this.requestDraw()
    })

    this.#observer.observe(this, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: ['x', 'y', 'from', 'to', 'id', 'data-node-type'],
    })

    this.#setupInteractions()

    this.#tickCleanup = this.tickEngine.addTickCallback({
      callback: () => {
        let needsDraw =
          this.#activeAnimations > 0 ||
          (this.connectionController && this.connectionController.isConnecting)
        if (this.#autoSort && this.layoutEngine?.tickPhysics) {
          const rect = this.getBoundingClientRect()
          const selectedIds = this.selectionManager.selectedIds
          const activeDraggedNodes = this.#activeDraggedBox
            ? selectedIds.length > 0
              ? selectedIds
              : [this.#activeDraggedBox.id]
            : []
          const physicsMoving = this.layoutEngine.tickPhysics(
            rect.width,
            rect.height,
            activeDraggedNodes,
          )
          if (physicsMoving) {
            needsDraw = true
            this.#isLayoutSettling = true
          } else if (this.#isLayoutSettling) {
            this.#isLayoutSettling = false
            this.dispatchEvent(new CustomEvent('layout-settled'))
            if (this.#pendingAutoZoomPadding !== null && !this.#activeDraggedBox) {
              const pad = this.#pendingAutoZoomPadding
              this.#pendingAutoZoomPadding = null
              this.autoZoom(pad)
            }
          }
        }

        if (needsDraw) {
          this.requestDraw()
        }
      },
    })

    this.addEventListener('axon-port-registered', (e) => {
      const detail = (e as CustomEvent).detail
      if (detail?.portId && this.adjacencyManager.connectedPorts.has(detail.portId)) {
        return
      }
      this.#scheduleAdjacency()
    })

    this.#scheduleAdjacency()
  }

  disconnectedCallback(): void {
    this.#isConnected = false
    this.#activeAnimations = 0
    if (this.#tickCleanup) {
      this.#tickCleanup()
      this.#tickCleanup = null
    }
    this.#observer?.disconnect()
    this.#resizeObserver?.disconnect()
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.#onWindowResize)
    }
    this.#observedBoxes.clear()
    this.#unsubs.forEach((unsub) => unsub())
    this.#unsubs = []
    this.edgeRenderer?.clear()
  }

  updateView(): void {
    this.viewportController?.updateView()
  }

  zoom(factor: number): void {
    const rect = this.getBoundingClientRect()
    const cx = rect.width / 2 || 400
    const cy = rect.height / 2 || 300
    this.viewportTransform.zoomAt(cx, cy, factor)
    this.updateView()
    this.requestDraw()
  }

  autoZoom(paddingColumns = 1): void {
    const boxes = this.queryScopedAll<AxonBoxType>(BOX_SELECTOR)
    if (boxes.length === 0) {
      this.viewportTransform.k = 1
      this.viewportTransform.x = 0
      this.viewportTransform.y = 0
      this.updateView()
      return
    }

    if (
      this.#autoSort &&
      this.layoutEngine &&
      (!this.#hasRunInitialLayout || this.#isLayoutSettling)
    ) {
      this.#pendingAutoZoomPadding = paddingColumns
    }

    this.resolveVerticalOverlaps()
    const columnWidth = this.layoutEngine?.columnWidth ?? 300
    this.viewportController.autoZoom(boxes, columnWidth, paddingColumns)
  }

  zoomToFit(paddingColumns = 1): void {
    this.autoZoom(paddingColumns)
  }

  resolveVerticalOverlaps(minGap = 48): boolean {
    const boxes = this.queryScopedAll<AxonBoxType>(BOX_SELECTOR)
    if (boxes.length < 2) return false

    if (this.layoutEngine?.resolveVerticalOverlaps) {
      const changed = this.layoutEngine.resolveVerticalOverlaps(boxes, minGap)
      if (changed) this.requestDraw()
      return changed
    }

    const resolver = new MagneticDAGEngine({ columnWidth: 340, verticalGap: minGap })
    const changed = resolver.resolveVerticalOverlaps(boxes, minGap)
    if (changed) this.requestDraw()
    return changed
  }

  syncEngineLayout(isInitial = false, force = false): void {
    if (!this.layoutEngine && force) {
      this.#layoutEngine = new MagneticDAGEngine({ columnWidth: 340, verticalGap: 48 })
    }
    if (!this.layoutEngine) return

    const boxes = this.queryScopedAll<AxonBoxType>(BOX_SELECTOR)
    const edges: [string, string][] = this.queryScopedAll<AxonEdgeType>(TAG_NAMES.AXON_EDGE).map(
      (e) => [e.getAttribute('from') || '', e.getAttribute('to') || ''],
    )

    if (isInitial) {
      if (this.#autoSort || force) {
        const rect = this.getBoundingClientRect()
        this.layoutEngine.initLayout(boxes, edges, rect.width, rect.height)
        this.rebuildAdjacency()
        this.requestDraw()
        if (this.#pendingAutoZoomPadding !== null) {
          const pad = this.#pendingAutoZoomPadding
          this.#pendingAutoZoomPadding = null
          this.autoZoom(pad)
        }
      }
    } else if ((this.#autoSort || force) && this.layoutEngine.onTopologyChange) {
      this.layoutEngine.onTopologyChange(boxes, edges)
      this.#isLayoutSettling = true
    }
  }

  handleConnectionStart(port: AxonPortBaseType): void {
    this.connectionController?.startConnection(port)
  }

  #setupInteractions(): void {
    this.addEventListener('dragover', (e: DragEvent) => {
      if (
        e.dataTransfer?.types?.includes('application/json') ||
        e.dataTransfer?.types?.includes('text/plain')
      ) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }
    })

    this.addEventListener('drop', (e: DragEvent) => {
      if (!e.dataTransfer) return
      let nodeType = ''
      let initialData: Record<string, unknown> = {}

      const json = e.dataTransfer.getData('application/json')
      if (json) {
        try {
          const parsed = JSON.parse(json)
          nodeType = parsed.type
          initialData = parsed.initialData || {}
        } catch {
          // fallback to text
        }
      }

      if (!nodeType) {
        nodeType = e.dataTransfer.getData('text/plain')
      }

      if (!nodeType) return

      e.preventDefault()
      e.stopPropagation()

      const rect = this.getBoundingClientRect()
      const mouseRelX = e.clientX - rect.left
      const mouseRelY = e.clientY - rect.top

      const worldPos = this.viewportTransform
        ? this.viewportTransform.toWorld(mouseRelX, mouseRelY)
        : { x: mouseRelX, y: mouseRelY }

      let finalX = Math.round(worldPos.x - 40)
      let finalY = Math.round(worldPos.y - 20)

      if (this.snapEnabled) {
        const gridSize = 20
        finalX = Math.round(finalX / gridSize) * gridSize
        finalY = Math.round(finalY / gridSize) * gridSize
      }

      this.spawnNode(nodeType, finalX, finalY, initialData, true)
    })

    this.addEventListener('wheel', (e) => {
      this.viewportController.handleWheel(e)
    })

    this.addEventListener('pointerdown', (e) => {
      const path = typeof e.composedPath === 'function' ? e.composedPath() : []
      const target = (path[0] ?? e.target) as Element
      if (!target || !(target instanceof Element)) return

      // Ignore interactions with interactive form controls
      const isInteractive =
        path.some((el) => el instanceof Element && AxonGraph.isInteractiveControl(el)) ||
        AxonGraph.isInteractiveControl(target)
      if (isInteractive) {
        return
      }

      let port: AxonPortBaseType | null = null
      for (const el of path) {
        if (
          el instanceof Element &&
          (el.matches?.(`${TAG_NAMES.AXON_PORT_IN}, ${TAG_NAMES.AXON_PORT_OUT}`) || isAxonPort(el))
        ) {
          port = el as AxonPortBaseType
          break
        }
      }
      if (!port && target && target instanceof Element) {
        port = target.closest(`${TAG_NAMES.AXON_PORT_IN}, ${TAG_NAMES.AXON_PORT_OUT}`) as AxonPortBaseType | null
      }

      if (!port) {
        port = this.findPortAtPoint(e.clientX, e.clientY, 20)
      }

      if (port) {
        e.stopPropagation()
        this.handleConnectionStart(port)
        return
      }

      let box: AxonBoxType | null = null
      for (const el of path) {
        if (el instanceof Element && el.matches?.(BOX_SELECTOR) && isAxonBox(el)) {
          box = el as AxonBoxType
          break
        }
      }
      if (!box && target && target instanceof Element) {
        const found = target.closest(BOX_SELECTOR)
        if (found && isAxonBox(found)) {
          box = found as AxonBoxType
        }
      }

      if (box && isAxonBox(box)) {
        this.#activeDraggedBox = box
        this.selectionController.handleBoxPointerDown(e, box)
        return
      }

      this.#handleCanvasPointerDown(e)
    })

    window.addEventListener('pointermove', (e) => {
      if (this.connectionController?.isConnecting) {
        this.connectionController.moveConnection(e)
      }
    })

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.connectionController?.isConnecting) {
        this.connectionController.endConnection(e)
      }
    })
  }

  #handleCanvasPointerDown(e: PointerEvent): void {
    if (e.button === 1 || e.altKey || (this.#dragMode === 'pan' && !e.shiftKey)) {
      this.viewportController.handlePan(e)
    } else if (e.button === 0) {
      this.selectionController.handleSelectionBox(e)
    }
  }

  draw(): void {
    if (!this.svg || !this.edgeRenderer || !this.adjacencyManager) return

    const graphRect = this.getBoundingClientRect()
    const visibleWorldBounds = this.viewportTransform.getVisibleWorldBounds(
      graphRect.width,
      graphRect.height,
    )
    const simulationTime = this.tickEngine.simulationTime

    const connectingState = {
      isConnecting: Boolean(this.connectionController?.isConnecting),
      ghostPos: this.connectionController?.ghostPos || null,
      connStartPort: this.connectionController?.connStartPort || null,
    }

    const animationCount = this.edgeRenderer.renderEdges(
      this.adjacencyManager.cachedEdges,
      this.adjacencyManager.edgeIds,
      visibleWorldBounds,
      simulationTime,
      connectingState,
    )

    this.#activeAnimations = animationCount

    if (this.connectionController?.isConnecting) {
      this.requestDraw()
    }
  }

  requestDraw(): void {
    if (this.#rafId === null) {
      this.#rafId = requestAnimationFrame(() => {
        this.#rafId = null
        this.draw()
      })
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_GRAPH)) {
  customElements.define(TAG_NAMES.AXON_GRAPH, AxonGraph)
}
