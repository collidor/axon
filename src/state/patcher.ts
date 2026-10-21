import type { SerializedGraph, SerializedNode, SerializedEdge } from '../core/serialization'
import { getNodeIdFromPort } from '../core/constants'

export type GraphPatchOp =
  | { op: 'ADD_NODE'; node: SerializedNode }
  | {
      op: 'UPDATE_NODE'
      nodeId: string
      data: Partial<Record<string, unknown>>
      x?: number
      y?: number
    }
  | { op: 'DELETE_NODE'; nodeId: string }
  | { op: 'ADD_EDGE'; edge: SerializedEdge }
  | { op: 'DELETE_EDGE'; from: string; to: string }

export interface FeatureFlagBranch {
  flagId: string
  targetGraphId: string
  baseVersion: number
  status: 'ACTIVE' | 'CONFLICTED' | 'MERGED'
  patches: GraphPatchOp[]
}

function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return structuredClone(obj)
  }
}

export class GraphPatcher {
  /**
   * Applies an array of patch operations to a base graph and returns a new execution-ready graph.
   */
  public static apply(baseGraph: SerializedGraph, branch: FeatureFlagBranch): SerializedGraph {
    // 1. Deep clone to prevent mutating the base graph reference
    const patchedGraph: SerializedGraph = safeClone(baseGraph)

    if (!patchedGraph.nodes) patchedGraph.nodes = []
    if (!patchedGraph.edges) patchedGraph.edges = []

    // 2. Iterate and apply deltas
    for (const patch of branch.patches) {
      switch (patch.op) {
        case 'ADD_NODE': {
          const existingIdx = patchedGraph.nodes.findIndex((n) => n.id === patch.node.id)
          if (existingIdx >= 0) {
            patchedGraph.nodes[existingIdx] = safeClone(patch.node)
          } else {
            patchedGraph.nodes.push(safeClone(patch.node))
          }
          break
        }

        case 'UPDATE_NODE': {
          const node = patchedGraph.nodes.find((n) => n.id === patch.nodeId)
          if (node) {
            if (patch.data) {
              node.data = {
                ...(node.data && typeof node.data === 'object' ? node.data : {}),
                ...patch.data,
              }
            }
            if (patch.x !== undefined) node.x = patch.x
            if (patch.y !== undefined) node.y = patch.y
          }
          break
        }

        case 'DELETE_NODE': {
          patchedGraph.nodes = patchedGraph.nodes.filter((n) => n.id !== patch.nodeId)
          // Auto-cleanup orphaned edges connected to the deleted node
          patchedGraph.edges = patchedGraph.edges.filter((e) => {
            const fromNode = getNodeIdFromPort(e.from)
            const toNode = getNodeIdFromPort(e.to)
            return fromNode !== patch.nodeId && toNode !== patch.nodeId
          })
          break
        }

        case 'ADD_EDGE': {
          const exists = patchedGraph.edges.some(
            (e) => e.from === patch.edge.from && e.to === patch.edge.to,
          )
          if (!exists) {
            patchedGraph.edges.push(safeClone(patch.edge))
          }
          break
        }

        case 'DELETE_EDGE': {
          patchedGraph.edges = patchedGraph.edges.filter(
            (e) => !(e.from === patch.from && e.to === patch.to),
          )
          break
        }
      }
    }

    return patchedGraph
  }
}
