import { Result, type Err, type ErrorLike } from '@collidor/toolkit'
import { kahnTopologicalSort } from '../core/kahnTopologicalSort'
import { barycenterCrossingReduction } from '../core/crossingReduction'
import { computeBoundedLayers } from '../core/boundedLayering'

export interface LayoutNode {
  readonly id: string
  x: number
  y: number
  vx: number
  vy: number
  height?: number
  width?: number
  offsetHeight?: number
  offsetWidth?: number
  axonNodeType?: string
  getAttribute?(name: string): string | null
  getBoundingClientRect?(): { width: number; height: number }
  moveTo(x: number, y: number): void
  nodeData?: {
    magneticDAG?: {
      layer?: number
      row?: number
    }
  }
}

export type EngineNode = LayoutNode

export const ESTIMATED_NODE_HEIGHTS: Record<string, number> = {
  'poly-synth': 340,
  synth: 340,
  'step-sequencer': 290,
  'audio-clock': 260,
  'audio-mixer': 260,
  'audio-combiner': 260,
  mixer: 260,
  'master-output': 260,
  'drum-sampler': 230,
  sampler: 230,
  sequence: 210,
  euclidean: 220,
  arpeggiator: 220,
  chord: 210,
  'scale-quantizer': 210,
  delay: 200,
  reverb: 190,
  bitcrusher: 190,
  parallel: 200,
  'uml-table': 280,
  'table-query': 260,
  'table-join': 260,
  'db-put': 280,
  feedback: 220,
  subgraph: 200,
  resource: 200,
  math: 190,
  logic: 190,
  compare: 190,
  gate: 190,
  display: 160,
  constant: 150,
  clock: 160,
}

export function getEffectiveNodeHeight(node: LayoutNode): number {
  if (typeof node.height === 'number' && node.height > 0) {
    return node.height
  }
  if (typeof node.offsetHeight === 'number' && node.offsetHeight > 0) {
    return node.offsetHeight
  }
  if (typeof node.getBoundingClientRect === 'function') {
    const rect = node.getBoundingClientRect()
    if (rect && typeof rect.height === 'number' && rect.height > 0) {
      return rect.height
    }
  }
  const rawType =
    node.axonNodeType ||
    (typeof node.getAttribute === 'function' ? node.getAttribute('data-node-type') : null)
  if (rawType) {
    const normalized = rawType.toLowerCase().replace(/_/g, '-')
    if (ESTIMATED_NODE_HEIGHTS[normalized]) {
      return ESTIMATED_NODE_HEIGHTS[normalized]
    }
    return 180
  }
  return 0
}

export interface LayoutEngine {
  readonly name: string
  nodes: LayoutNode[]
  edges: [string, string][]

  initLayout(
    nodes: LayoutNode[],
    edges: [string, string][],
    canvasWidth: number,
    canvasHeight: number,
  ): Result<void> | void

  updateDraggedNode(node: LayoutNode): void
  tickPhysics?(canvasWidth: number, canvasHeight: number, activeDraggedNodes: string[]): boolean
  onTopologyChange?(nodes: LayoutNode[], edges: [string, string][]): void
  resolveVerticalOverlaps?(nodes: LayoutNode[], minGap?: number): boolean
  snapThreshold?: number
  columnWidth?: number
}

export interface MagneticDAGEngineOptions {
  columnWidth?: number
  rowHeight?: number
  nodeMarginX?: number
  nodeMarginY?: number
  verticalGap?: number
  snapStrength?: number
  friction?: number
  damping?: number
  springK?: number
  squareDisposition?: boolean
  targetAspectRatio?: number
  maxNodesPerLayer?: number
  gridStartX?: number
  gridStartY?: number
  crossingReduction?: boolean
  crossingReductionPasses?: number
}

const normalizeNodeId = (id: string): string => {
  const idx = id.indexOf(':')
  return idx !== -1 ? id.slice(0, idx) : id
}

export class MagneticDAGEngine implements LayoutEngine {
  name = 'magnetic-dag'
  nodes: EngineNode[] = []
  nodesMap: Map<string, EngineNode> = new Map()
  edges: [string, string][] = []
  snapThreshold = 0.5

  parentsMap: Map<string, Set<string>> = new Map()
  childrenMap: Map<string, Set<string>> = new Map()
  layersMap: Map<string, number> = new Map()

  private hasCustomRowHeight = false
  private hasCustomColumnWidth = false

  #columnWidth = 300
  get columnWidth(): number {
    return this.#columnWidth
  }
  set columnWidth(val: number) {
    if (val > 0 && val !== this.#columnWidth) {
      this.#columnWidth = val
      this.hasCustomColumnWidth = true
      this.nodeMarginX = Math.max(150, Math.min(val - 40, val * 0.75))
      this.isTopologyDirty = true
    }
  }

  #rowHeight = 150
  get rowHeight(): number {
    return this.#rowHeight
  }
  set rowHeight(val: number) {
    if (val > 0 && val !== this.#rowHeight) {
      this.#rowHeight = val
      this.hasCustomRowHeight = true
      this.nodeMarginY = Math.max(80, val)
      this.isTopologyDirty = true
    }
  }

  snapStrength = 0.35
  friction = 0.6

  // --- Margin & Repel Configuration ---
  nodeMarginX = 220
  nodeMarginY = 140
  verticalGap = 48
  repelStrengthX = 0.03
  repelStrengthY = 0.05

  // --- Disposition & Crossing Optimization ---
  squareDisposition = false
  targetAspectRatio = 1.0
  maxNodesPerLayer?: number
  crossingReduction = true
  crossingReductionPasses = 6

  isTopologyDirty = false
  private maxLayer = 0
  private cachedColumns: number[] = []
  gridStartX = 100
  gridStartY = 80

  constructor(options: MagneticDAGEngineOptions = {}) {
    if (options.gridStartX !== undefined) this.gridStartX = options.gridStartX
    if (options.gridStartY !== undefined) this.gridStartY = options.gridStartY
    if (options.columnWidth !== undefined) {
      this.columnWidth = options.columnWidth
      this.hasCustomColumnWidth = true
    }
    if (options.rowHeight !== undefined) {
      this.rowHeight = options.rowHeight
      this.hasCustomRowHeight = true
    }
    if (options.nodeMarginX !== undefined) this.nodeMarginX = options.nodeMarginX
    if (options.nodeMarginY !== undefined) this.nodeMarginY = options.nodeMarginY
    if (options.verticalGap !== undefined) this.verticalGap = options.verticalGap
    if (options.snapStrength !== undefined) this.snapStrength = options.snapStrength
    if (options.friction !== undefined) this.friction = options.friction
    if (options.squareDisposition !== undefined) this.squareDisposition = options.squareDisposition
    if (options.targetAspectRatio !== undefined) this.targetAspectRatio = options.targetAspectRatio
    if (options.maxNodesPerLayer !== undefined) this.maxNodesPerLayer = options.maxNodesPerLayer
    if (options.crossingReduction !== undefined) this.crossingReduction = options.crossingReduction
    if (options.crossingReductionPasses !== undefined) {
      this.crossingReductionPasses = options.crossingReductionPasses
    }
  }

  getNodeHeight(node: EngineNode): number {
    return getEffectiveNodeHeight(node)
  }

  getRequiredStepAfter(node: EngineNode, basePitch = this.nodeMarginY): number {
    const h = this.getNodeHeight(node)
    return h > 0 ? Math.max(basePitch, h + this.verticalGap) : basePitch
  }

  onTopologyChange(nodes: EngineNode[], edges: [string, string][]): void {
    this.nodes = nodes
    this.edges = edges
    this.isTopologyDirty = true
  }

  initLayout(
    nodes: EngineNode[],
    edges: [string, string][],
    _canvasWidth: number,
    canvasHeight: number,
  ): Result<void> {
    this.nodes = nodes
    this.edges = edges
    this.rebuildAdjacencyMaps()

    const effectiveHeight = Math.max(600, canvasHeight || 600)

    const normalizedEdges: [string, string][] = edges.map(([from, to]) => [
      normalizeNodeId(from),
      normalizeNodeId(to),
    ])

    const topoOrderResult = kahnTopologicalSort(nodes, normalizedEdges)
    if (!topoOrderResult.success) return topoOrderResult as Err<ErrorLike>

    const layersResult = this.calculateLayers(nodes, normalizedEdges)
    if (!layersResult.success) return layersResult as Err<ErrorLike>

    this.layersMap = layersResult.value.layers
    this.maxLayer = layersResult.value.maxLayer

    this.rebuildColumnCoordinatesCache()

    // Group nodes by layer to vertically distribute them cleanly without overlap
    const layerNodesMap = new Map<number, EngineNode[]>()
    for (const nodeId of topoOrderResult.value.result) {
      const node = this.nodesMap.get(nodeId)
      if (!node) continue
      const layer = this.layersMap.get(nodeId) ?? 0
      let list = layerNodesMap.get(layer)
      if (!list) {
        list = []
        layerNodesMap.set(layer, list)
      }
      list.push(node)
    }

    // Apply crossing reduction if enabled
    if (this.crossingReduction && this.maxLayer > 0) {
      const layerArrays: string[][] = []
      for (let l = 0; l <= this.maxLayer; l++) {
        const list = layerNodesMap.get(l) || []
        layerArrays.push(list.map((n) => n.id))
      }

      const reorderedLayers = barycenterCrossingReduction(
        layerArrays,
        this.parentsMap,
        this.childrenMap,
        this.crossingReductionPasses,
      )

      for (let l = 0; l <= this.maxLayer; l++) {
        const orderedIds = reorderedLayers[l] || []
        const currentList = layerNodesMap.get(l) || []
        const nodeLookup = new Map(currentList.map((n) => [n.id, n]))
        layerNodesMap.set(l, orderedIds.map((id) => nodeLookup.get(id)!).filter(Boolean))
      }
    }

    const rowPitch = this.rowHeight || this.nodeMarginY

    for (const [layer, list] of layerNodesMap.entries()) {
      const x = this.cachedColumns[layer] ?? this.gridStartX + layer * this.columnWidth
      const count = list.length

      if (this.squareDisposition) {
        const startY = this.gridStartY
        let curY = startY
        list.forEach((node, index) => {
          const yPos = index === 0 ? startY : curY
          node.moveTo(x, yPos)
          node.vx = 0
          node.vy = 0
          curY = yPos + this.getRequiredStepAfter(node, rowPitch)
        })
        continue
      }

      // Compute cumulative height offsets per node in this column
      const stepPitches: number[] = []
      let totalSpan = 0
      for (let i = 0; i < count - 1; i++) {
        const step = this.getRequiredStepAfter(list[i], rowPitch)
        stepPitches.push(step)
        totalSpan += step
      }

      const startY = Math.max(80, (effectiveHeight - totalSpan) / 2)
      const desiredYs: number[] = []
      let cumOffset = 0

      list.forEach((node, index) => {
        let initialY = startY + cumOffset

        if (layer > 0) {
          const parents = this.parentsMap.get(node.id) ?? new Set()
          if (parents.size > 0) {
            const parentsArray = Array.from(parents)
            const parentYSum = parentsArray.reduce((sum, parentId) => {
              const parentNode = this.nodesMap.get(parentId)
              return sum + (parentNode ? parentNode.y : 0)
            }, 0)
            const parentAvgY = parentYSum / parents.size
            const offsetFromCenter = cumOffset - totalSpan / 2
            initialY = Math.max(80, parentAvgY + offsetFromCenter)
          }
        }

        desiredYs.push(initialY)
        if (index < count - 1) {
          cumOffset += stepPitches[index]
        }
      })

      // Enforce strict minimum vertical distance accounting for node heights
      for (let i = 1; i < count; i++) {
        const minAllowedY = desiredYs[i - 1] + stepPitches[i - 1]
        if (desiredYs[i] < minAllowedY) {
          desiredYs[i] = minAllowedY
        }
      }

      list.forEach((node, index) => {
        if (typeof node.moveTo === 'function') {
          node.moveTo(x, desiredYs[index])
        } else {
          node.x = x
          node.y = desiredYs[index]
        }
        node.vx = 0
        node.vy = 0
      })
    }

    this.isTopologyDirty = false

    // Settle layout physics only for dynamic free-floating layouts.
    // squareDisposition uses strict grid coordinates to preserve clean horizontal row alignment.
    if (!this.squareDisposition) {
      this.stabilizeLayout(effectiveHeight, 50)
    }

    return Result.ok(undefined)
  }

  /**
   * Run physics iterations until the layout converges and all node velocities stabilize to 0.
   */
  stabilizeLayout(canvasHeight: number = 600, maxIterations = 50): void {
    for (let iter = 0; iter < maxIterations; iter++) {
      const isMoving = this.tickPhysics(800, canvasHeight, [])
      if (!isMoving) break
    }
    for (const node of this.nodes) {
      node.vx = 0
      node.vy = 0
    }
  }

  /**
   * Backward-compatible alias for stabilizeLayout conforming to LayoutEngine interface.
   */
  settle(_canvasWidth: number, canvasHeight: number, maxIterations = 50): void {
    this.stabilizeLayout(canvasHeight, maxIterations)
  }

  updateDraggedNode(node: EngineNode): void {
    node.vx = 0
    node.vy = 0
  }

  calculateLayers(
    nodes: { id: string }[],
    edges: [string, string][],
  ): Result<{ layers: Map<string, number>; maxLayer: number }> {
    const normalizedEdges: [string, string][] = edges.map(([from, to]) => [
      normalizeNodeId(from),
      normalizeNodeId(to),
    ])

    if (this.squareDisposition) {
      return computeBoundedLayers(nodes, normalizedEdges, {
        targetAspectRatio: this.targetAspectRatio,
        maxNodesPerLayer: this.maxNodesPerLayer,
        columnWidth: this.hasCustomColumnWidth ? this.columnWidth : undefined,
        rowHeight: this.hasCustomRowHeight ? this.rowHeight : undefined,
      })
    }

    const layersMap = new Map<string, number>()
    let maxLayer = 0

    for (const node of nodes) layersMap.set(node.id, 0)

    const topologicalOrderResult = kahnTopologicalSort(nodes, normalizedEdges)
    if (!topologicalOrderResult.success) return topologicalOrderResult as Err<ErrorLike>

    for (const node of topologicalOrderResult.value.result) {
      const currentLayer = layersMap.get(node) ?? 0
      const outbound = topologicalOrderResult.value.adjList[node] || []

      for (const adjNode of outbound) {
        const targetLayer = layersMap.get(adjNode) ?? 0
        const distance = Math.max(targetLayer, currentLayer + 1)
        layersMap.set(adjNode, distance)
        maxLayer = Math.max(maxLayer, distance)
      }
    }

    return Result.ok({ layers: layersMap, maxLayer })
  }

  tickPhysics(_canvasWidth: number, _canvasHeight: number, activeDraggedNodes: string[]): boolean {
    if (this.isTopologyDirty || this.layersMap.size === 0) {
      this.rebuildAdjacencyMaps()
      const normalizedEdges: [string, string][] = this.edges.map(([from, to]) => [
        normalizeNodeId(from),
        normalizeNodeId(to),
      ])
      const layersResult = this.calculateLayers(this.nodes, normalizedEdges)
      if (layersResult.success) {
        this.layersMap = layersResult.value.layers
        const layersArray = Array.from(this.layersMap.values())
        this.maxLayer = layersArray.length > 0 ? Math.max(...layersArray) : 0
      }
      this.rebuildColumnCoordinatesCache()
      this.isTopologyDirty = false
    }

    const startX = this.gridStartX

    // 1. Column snap forces for non-dragged nodes
    for (const node of this.nodes) {
      if (activeDraggedNodes.includes(node.id)) {
        node.vx = 0
        node.vy = 0
        continue
      }

      const layer = this.layersMap.get(node.id) ?? 0
      const targetColX = this.cachedColumns[layer] ?? startX + layer * this.columnWidth

      node.vx += this.snapStrength * (targetColX - node.x)
    }

    // 2. Pairwise X & Y Repel / Margin Collision for non-dragged nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const nodeA = this.nodes[i]
      if (!nodeA || activeDraggedNodes.includes(nodeA.id)) continue
      const layerA = this.layersMap.get(nodeA.id) ?? 0

      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeB = this.nodes[j]
        if (!nodeB || activeDraggedNodes.includes(nodeB.id)) continue
        const layerB = this.layersMap.get(nodeB.id) ?? 0

        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        const upperNode = nodeA.y <= nodeB.y ? nodeA : nodeB
        const requiredMarginY = this.getRequiredStepAfter(upperNode, this.nodeMarginY)

        if (absDx < this.nodeMarginX && absDy < requiredMarginY) {
          const overlapY = requiredMarginY - absDy
          const dirY = dy === 0 ? (j % 2 === 0 ? 1 : -1) : dy > 0 ? 1 : -1
          const pushY = dirY * overlapY * this.repelStrengthY

          nodeA.vy -= pushY
          nodeB.vy += pushY

          // Only apply horizontal repel between nodes of different layers
          if (layerA !== layerB) {
            const overlapX = this.nodeMarginX - absDx
            const dirX = dx === 0 ? (i % 2 === 0 ? 1 : -1) : dx > 0 ? 1 : -1
            const pushX = dirX * overlapX * this.repelStrengthX
            nodeA.vx -= pushX
            nodeB.vx += pushX
          }
        }
      }
    }

    // 3. Integrate velocity, apply friction, update positions
    let isMoving = false

    for (const node of this.nodes) {
      if (activeDraggedNodes.includes(node.id)) {
        node.vx = 0
        node.vy = 0
        continue
      }

      node.vx *= this.friction
      node.vy *= this.friction

      if (Math.abs(node.vx) > 0.05 || Math.abs(node.vy) > 0.05) {
        isMoving = true
      }

      const nextX = node.x + node.vx
      const nextY = node.y + node.vy
      if (typeof node.moveTo === 'function') {
        node.moveTo(nextX, nextY)
      } else {
        node.x = nextX
        node.y = nextY
      }
    }

    return isMoving
  }

  /**
   * Static helper to resolve vertical overlaps on an array of nodes.
   */
  static resolveVerticalOverlaps(nodes: EngineNode[], minGap = 48): boolean {
    const engine = new MagneticDAGEngine({ verticalGap: minGap })
    return engine.resolveVerticalOverlaps(nodes, minGap)
  }

  /**
   * Resolves vertical overlaps among nodes sharing the same horizontal column
   * by accounting for each node's actual or estimated height plus a vertical gap.
   */
  resolveVerticalOverlaps(nodes: EngineNode[] = this.nodes, minGap = this.verticalGap): boolean {
    if (nodes.length < 2) return false
    let adjusted = false

    // Group nodes into columns based on horizontal proximity
    const colThreshold = Math.max(120, this.nodeMarginX * 0.75)
    const columns: EngineNode[][] = []

    const sortedByX = [...nodes].sort((a, b) => (a.x ?? 0) - (b.x ?? 0))
    for (const node of sortedByX) {
      const col = columns.find((c) => Math.abs((c[0].x ?? 0) - (node.x ?? 0)) < colThreshold)
      if (col) {
        col.push(node)
      } else {
        columns.push([node])
      }
    }

    for (const col of columns) {
      if (col.length < 2) continue
      col.sort((a, b) => (a.y ?? 0) - (b.y ?? 0))
      for (let i = 1; i < col.length; i++) {
        const upper = col[i - 1]
        const lower = col[i]
        const upperHeight = this.getNodeHeight(upper)
        const requiredStep =
          upperHeight > 0 ? Math.max(this.nodeMarginY, upperHeight + minGap) : this.nodeMarginY
        const minAllowedY = (upper.y ?? 0) + requiredStep
        if ((lower.y ?? 0) < minAllowedY) {
          const nextX = lower.x ?? 0
          if (typeof lower.moveTo === 'function') {
            lower.moveTo(nextX, minAllowedY)
          } else {
            lower.x = nextX
            lower.y = minAllowedY
          }
          adjusted = true
        }
      }
    }

    return adjusted
  }

  private rebuildAdjacencyMaps(): void {
    this.nodesMap.clear()
    this.parentsMap.clear()
    this.childrenMap.clear()

    for (const node of this.nodes) this.nodesMap.set(node.id, node)

    for (const [from, to] of this.edges) {
      const fromNode = normalizeNodeId(from)
      const toNode = normalizeNodeId(to)
      if (!fromNode || !toNode || fromNode === toNode) continue

      let parents = this.parentsMap.get(toNode)
      if (!parents) {
        parents = new Set()
        this.parentsMap.set(toNode, parents)
      }
      parents.add(fromNode)

      let children = this.childrenMap.get(fromNode)
      if (!children) {
        children = new Set()
        this.childrenMap.set(fromNode, children)
      }
      children.add(toNode)
    }
  }

  private rebuildColumnCoordinatesCache(): void {
    this.cachedColumns = []
    for (let i = 0; i <= Math.max(10, this.maxLayer); i++) {
      this.cachedColumns.push(this.gridStartX + i * this.columnWidth)
    }
  }
}
