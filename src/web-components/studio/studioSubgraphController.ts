import type { AxonGraph } from '../axonGraph.component'
import type { AxonBreadcrumbs } from '../axonBreadcrumbs.component'
import type { SerializedGraph } from '../../core/serialization'
import { syncSubgraphPorts } from '../../nodes/subgraph.node'

export interface SubgraphNavigationLayer {
  nodeId: string
  label: string
  graphSnapshot: SerializedGraph
}

export interface SubgraphHost {
  graph: AxonGraph | null
  breadcrumbs: AxonBreadcrumbs | null
  updateStatus(): void
}

/**
 * Controller managing nested subgraph navigation, layer drilldown stack,
 * visual breadcrumbs, and parent/child graph state synchronization.
 */
export class StudioSubgraphController {
  private readonly host: SubgraphHost
  public navStack: SubgraphNavigationLayer[] = []
  private upButtonElement: HTMLButtonElement | null = null

  constructor(host: SubgraphHost) {
    this.host = host
  }

  public bindElements(elements: { upButton: HTMLButtonElement | null }): void {
    this.upButtonElement = elements.upButton
  }

  public get depth(): number {
    return this.navStack.length
  }

  /**
   * Resets the subgraph navigation stack and breadcrumbs bar.
   */
  public reset(): void {
    this.navStack = []
    this.host.breadcrumbs?.reset()
    if (this.upButtonElement) {
      this.upButtonElement.classList.add('is-hidden')
    }
  }

  /**
   * Drills down into a nested subgraph node by capturing the current canvas snapshot
   * and loading the inner graph into the canvas viewport.
   */
  public drillDown(nodeId: string): boolean {
    if (!this.host.graph) return false
    const nodeBoxElement = this.host.graph.querySelector(`#${CSS.escape(nodeId)}`) as any
    if (!nodeBoxElement) return false

    const displayLabel =
      nodeBoxElement.nodeData?.name ||
      nodeBoxElement.engine?.data?.name ||
      nodeBoxElement.getAttribute('data-name') ||
      nodeBoxElement.getAttribute('title') ||
      nodeId

    const parentGraphSnapshot = this.host.graph.serialize()
    const rawInnerGraph: SerializedGraph =
      nodeBoxElement.nodeData?.graph ||
      nodeBoxElement.engine?.data?.graph ||
      nodeBoxElement.engine?.state?.innerGraph?.exportState?.() ||
      { nodes: [], edges: [] }

    const innerGraphPayload: SerializedGraph = {
      nodes: rawInnerGraph?.nodes || [],
      edges: rawInnerGraph?.edges || [],
    }

    this.navStack.push({
      nodeId,
      label: displayLabel,
      graphSnapshot: parentGraphSnapshot,
    })

    this.host.breadcrumbs?.pushCrumb({
      id: nodeId,
      label: displayLabel,
      nodeId,
    })

    if (this.upButtonElement) {
      this.upButtonElement.classList.remove('is-hidden')
    }

    this.host.graph.loadGraph(innerGraphPayload, false)
    setTimeout(() => {
      this.host.graph?.zoomToFit?.()
      this.host.updateStatus()
    }, 50)

    return true
  }

  /**
   * Navigates back up to a specific ancestor depth level, restoring parent graph
   * and updating the edited subgraph's internal payload and port interface.
   */
  public navigateUpTo(targetDepthIndex: number): boolean {
    if (!this.host.graph || this.navStack.length === 0) return false
    if (targetDepthIndex >= this.navStack.length) return false

    while (this.navStack.length > targetDepthIndex) {
      const topLayer = this.navStack.pop()!
      const currentInnerGraph = this.host.graph.serialize()

      // Restore parent graph snapshot
      this.host.graph.loadGraph(topLayer.graphSnapshot, false)

      // Find the subgraph node in parent graph and update its inner definition and port layout
      const parentSubgraphBox = this.host.graph.querySelector(
        `#${CSS.escape(topLayer.nodeId)}`,
      ) as any
      if (parentSubgraphBox) {
        parentSubgraphBox.nodeData = {
          ...(parentSubgraphBox.nodeData || {}),
          graph: currentInnerGraph,
        }
        if (parentSubgraphBox.engine) {
          syncSubgraphPorts(parentSubgraphBox.engine)
        }
        if (typeof parentSubgraphBox.render === 'function') {
          parentSubgraphBox.render()
        }
      }
    }

    const updatedBreadcrumbItems = this.host.breadcrumbs?.items.slice(0, targetDepthIndex + 1) || []
    if (this.host.breadcrumbs) {
      this.host.breadcrumbs.items = updatedBreadcrumbItems
    }

    if (this.upButtonElement) {
      this.upButtonElement.classList.toggle('is-hidden', this.navStack.length === 0)
    }

    setTimeout(() => {
      this.host.graph?.zoomToFit?.()
      this.host.updateStatus()
    }, 50)

    return true
  }

  /**
   * Exits the current active subgraph, ascending one level up in the hierarchy.
   */
  public exitCurrentSubgraph(): boolean {
    if (this.navStack.length === 0) return false
    return this.navigateUpTo(this.navStack.length - 1)
  }
}
