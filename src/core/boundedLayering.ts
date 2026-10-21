import { Result, type Err, type ErrorLike } from '@collidor/toolkit'
import { kahnTopologicalSort } from './kahnTopologicalSort'

export interface BoundedLayeringOptions {
  /** Target width / height ratio. Default is 1.0 (square disposition). */
  targetAspectRatio?: number
  /** Explicit maximum number of nodes permitted per layer/column. Defaults to ceil(sqrt(N * (columnWidth/rowHeight) / aspect)). */
  maxNodesPerLayer?: number
  /** Horizontal column pitch or typical width of a node/column (in px). */
  columnWidth?: number
  /** Vertical row pitch or typical height of a node/row (in px). */
  rowHeight?: number
}

/**
 * Computes layer indices for DAG nodes ensuring:
 * 1. Strict dependency precedence: for every edge u -> v, layer(u) < layer(v).
 * 2. Bounded layer width: prevents tall single-column ribbons by distributing nodes
 *    into a balanced 2D square disposition.
 */
export function computeBoundedLayers(
  nodes: { id: string }[],
  edges: [string, string][],
  options: BoundedLayeringOptions = {},
): Result<{ layers: Map<string, number>; maxLayer: number }> {
  if (nodes.length === 0) {
    return Result.ok({ layers: new Map<string, number>(), maxLayer: 0 })
  }

  // 1. Run Kahn topological sort to ensure DAG validity and detect cycles
  const topoResult = kahnTopologicalSort(nodes, edges)
  if (!topoResult.success) {
    return topoResult as Err<ErrorLike>
  }

  // 2. Build adjacency maps
  const parentsMap = new Map<string, Set<string>>()
  const childrenMap = new Map<string, Set<string>>()
  for (const n of nodes) {
    parentsMap.set(n.id, new Set())
    childrenMap.set(n.id, new Set())
  }

  for (const [from, to] of edges) {
    if (parentsMap.has(to) && childrenMap.has(from)) {
      parentsMap.get(to)!.add(from)
      childrenMap.get(from)!.add(to)
    }
  }

  // 3. Compute downstream rank / height for each node (longest path to sink)
  // Process in reverse topological order
  const downstreamHeight = new Map<string, number>()
  const reversedTopo = [...topoResult.value.result].reverse()
  for (const nodeId of reversedTopo) {
    let maxHeight = 0
    const children = childrenMap.get(nodeId)
    if (children && children.size > 0) {
      for (const child of children) {
        maxHeight = Math.max(maxHeight, (downstreamHeight.get(child) ?? 0) + 1)
      }
    }
    downstreamHeight.set(nodeId, maxHeight)
  }

  // 4. Calculate target maximum width per column
  const n = nodes.length
  const aspect = Math.max(0.2, Math.min(5, options.targetAspectRatio ?? 1.0))
  const dimRatio =
    options.columnWidth && options.rowHeight && options.rowHeight > 0
      ? options.columnWidth / options.rowHeight
      : 1.0
  const calculatedCapacity = Math.max(1, Math.ceil(Math.sqrt((n * dimRatio) / aspect)))
  const maxCapacity = options.maxNodesPerLayer ?? calculatedCapacity

  // 5. Greedily assign layers from layer 0 upwards
  const layersMap = new Map<string, number>()
  const unassigned = new Set<string>(nodes.map((n) => n.id))

  let currentLayer = 0

  while (unassigned.size > 0) {
    // A node is a candidate for currentLayer if all its parents are already assigned to layers < currentLayer
    const candidates: string[] = []
    for (const nodeId of unassigned) {
      const parents = parentsMap.get(nodeId)!
      let allParentsAssignedBefore = true
      for (const p of parents) {
        const pLayer = layersMap.get(p)
        if (pLayer === undefined || pLayer >= currentLayer) {
          allParentsAssignedBefore = false
          break
        }
      }

      if (allParentsAssignedBefore) {
        candidates.push(nodeId)
      }
    }

    if (candidates.length === 0) {
      // Safety fallback: if no candidate can be placed (should not happen in a DAG), advance layer
      currentLayer++
      continue
    }

    // Sort candidates:
    // 1. Greatest downstream height (critical path nodes first)
    // 2. Nodes that have parents in currentLayer - 1 (keep edge lengths short)
    // 3. Greatest number of children
    candidates.sort((a, b) => {
      const hA = downstreamHeight.get(a) ?? 0
      const hB = downstreamHeight.get(b) ?? 0
      if (hA !== hB) return hB - hA

      const parentsA = parentsMap.get(a)!
      const parentsB = parentsMap.get(b)!
      const aHasImmediateParent = Array.from(parentsA).some(
        (p) => layersMap.get(p) === currentLayer - 1,
      )
      const bHasImmediateParent = Array.from(parentsB).some(
        (p) => layersMap.get(p) === currentLayer - 1,
      )
      if (aHasImmediateParent !== bHasImmediateParent) {
        return aHasImmediateParent ? -1 : 1
      }

      const cA = childrenMap.get(a)?.size ?? 0
      const cB = childrenMap.get(b)?.size ?? 0
      return cB - cA
    })

    // Assign at most maxCapacity nodes to currentLayer
    const nodesToAssign = candidates.slice(0, maxCapacity)
    for (const nodeId of nodesToAssign) {
      layersMap.set(nodeId, currentLayer)
      unassigned.delete(nodeId)
    }

    currentLayer++
  }

  const maxLayer = Math.max(0, currentLayer - 1)

  return Result.ok({ layers: layersMap, maxLayer })
}
