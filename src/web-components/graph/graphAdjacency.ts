import type { AxonEdgeType, AxonPortBaseType, Offset } from '../constants.js'
import { escapePortId } from '../helpers.js'
import type { BaseGraph } from '../../core/base.graph.js'

export interface GraphAdjacencyHost {
  engine: BaseGraph
  getPortValue(portId: string): any
  setPortValue(portId: string, value: any): void
  queryScoped<T extends Element>(selector: string): T | null
  queryScopedAll<T extends Element>(selector: string): T[]
}

/**
 * Manager responsible for synchronizing DOM edge elements with the headless BaseGraph engine,
 * tracking port connectivity lifecycles (onConnected/onDisconnected), and caching port geometry.
 */
export class GraphAdjacencyManager {
  private readonly host: GraphAdjacencyHost
  public cachedEdges: AxonEdgeType[] = []
  public readonly edgeIds = new Set<AxonEdgeType>()
  public readonly connectedPorts = new Set<string>()
  public readonly portOffsets = new Map<string, Offset>()
  private isAdjacencyMicrotaskPending = false

  constructor(host: GraphAdjacencyHost) {
    this.host = host
  }

  /**
   * Updates cached list of edges and keeps metadata records in sync.
   */
  updateCachedEdges(metadataMap: Map<AxonEdgeType, any>, edgeSelector: string): void {
    this.cachedEdges = this.host.queryScopedAll<AxonEdgeType>(edgeSelector)
    this.edgeIds.clear()

    const activeEdgesInDom = new Set<AxonEdgeType>()
    this.cachedEdges.forEach((edgeElement) => {
      activeEdgesInDom.add(edgeElement)
      this.edgeIds.add(edgeElement)

      if (!metadataMap.has(edgeElement)) {
        metadataMap.set(edgeElement, {
          fromPort: null,
          toPort: null,
          lastPath: '',
          isVisible: false,
          hitLine: null,
          mainLine: null,
          wasAnimated: false,
        })
      }
    })

    // Prune stale edge metadata for elements no longer in DOM
    for (const edge of metadataMap.keys()) {
      if (!activeEdgesInDom.has(edge)) {
        metadataMap.delete(edge)
      }
    }
  }

  /**
   * Rebuilds the graph topology, informs headless BaseGraph engine,
   * fires onConnected/onDisconnected callbacks, and flushes initial signal values.
   */
  rebuildAdjacency(metadataMap: Map<AxonEdgeType, any>, edgeSelector: string): void {
    const previouslyConnectedPorts = new Set(this.connectedPorts)
    this.connectedPorts.clear()

    this.host.engine.clearEdges()
    this.updateCachedEdges(metadataMap, edgeSelector)

    this.cachedEdges.forEach((edgeElement) => {
      const fromPortId = edgeElement.getAttribute('from')
      const toPortId = edgeElement.getAttribute('to')
      if (fromPortId && toPortId) {
        this.host.engine.addEdge(fromPortId, toPortId)
        this.connectedPorts.add(fromPortId)
        this.connectedPorts.add(toPortId)

        const initialSourceValue = this.host.getPortValue(fromPortId)
        if (initialSourceValue !== undefined) {
          this.host.setPortValue(toPortId, initialSourceValue)
        }
      }
    })

    // Notify newly connected ports
    this.connectedPorts.forEach((portId) => {
      if (!previouslyConnectedPorts.has(portId)) {
        const portElement = this.host.queryScoped(
          '#' + escapePortId(portId),
        ) as AxonPortBaseType | null
        portElement?.onConnected?.()
      }
    })

    // Notify ports that were disconnected and unbind engine node ports
    previouslyConnectedPorts.forEach((portId) => {
      if (!this.connectedPorts.has(portId)) {
        const portElement = this.host.queryScoped(
          '#' + escapePortId(portId),
        ) as AxonPortBaseType | null
        portElement?.onDisconnected?.()
        const [nodeId, portName] = portId.split(':')
        if (nodeId && portName) {
          const engineNode = this.host.engine.getNode(nodeId)
          if (engineNode) {
            if ((engineNode.inputNames as any).includes(portName)) {
              engineNode.disconnectInput(portName)
            }
            if ((engineNode.outputNames as any).includes(portName)) {
              engineNode.disconnectOutput(portName)
            }
          }
        }
      }
    })

    void this.host.engine.settle()
  }

  /**
   * Schedules a debounced adjacency rebuild via queueMicrotask to avoid thrashing
   * during rapid multi-port DOM mounting.
   */
  scheduleAdjacency(rebuildCallback: () => void): void {
    if (this.isAdjacencyMicrotaskPending) return
    this.isAdjacencyMicrotaskPending = true
    queueMicrotask(() => {
      this.isAdjacencyMicrotaskPending = false
      rebuildCallback()
    })
  }
}
