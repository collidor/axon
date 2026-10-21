import type { SerializedGraph } from '../core/serialization'
import { getNodeIdFromPort } from '../core/constants'
import type { FeatureFlagBranch } from './patcher'

export class GraphDiffEngine {
  /**
   * Validates if a branch's patches can still be applied safely to a mutated Main graph.
   * Returns an array of conflict error strings. Empty array means no conflicts.
   */
  public static detectConflicts(
    newMainGraph: SerializedGraph,
    branch: Pick<FeatureFlagBranch, 'patches'>,
  ): string[] {
    const conflicts: string[] = []
    const mainNodes = newMainGraph.nodes ?? []

    // 1. Create sets of IDs for tracking topological presence
    const addedNodeIds = new Set<string>()
    const deletedNodeIds = new Set<string>()

    for (const patch of branch.patches) {
      if (patch.op === 'ADD_NODE') {
        addedNodeIds.add(patch.node.id)
      } else if (patch.op === 'DELETE_NODE') {
        deletedNodeIds.add(patch.nodeId)
      }
    }

    const isNodePresent = (nodeId: string): boolean => {
      if (deletedNodeIds.has(nodeId)) return false
      return mainNodes.some((n) => n.id === nodeId) || addedNodeIds.has(nodeId)
    }

    // 2. Evaluate all patches against the mutated main graph
    for (const patch of branch.patches) {
      // Rule 1: Cannot update or delete a node that no longer exists in Main
      if (patch.op === 'UPDATE_NODE' || patch.op === 'DELETE_NODE') {
        const existsInMain = mainNodes.some((n) => n.id === patch.nodeId)
        if (!existsInMain && !addedNodeIds.has(patch.nodeId)) {
          conflicts.push(
            `Conflict: Patch targets Node '${patch.nodeId}', which no longer exists in Main.`,
          )
        }
      }

      // Rule 2: Cannot add an edge if either the source or target node is missing
      if (patch.op === 'ADD_EDGE') {
        const sourceNodeId = getNodeIdFromPort(patch.edge.from)
        const targetNodeId = getNodeIdFromPort(patch.edge.to)

        if (!isNodePresent(sourceNodeId)) {
          conflicts.push(
            `Conflict: Added edge '${patch.edge.from} -> ${patch.edge.to}' references missing source Node '${sourceNodeId}'.`,
          )
        }
        if (!isNodePresent(targetNodeId)) {
          conflicts.push(
            `Conflict: Added edge '${patch.edge.from} -> ${patch.edge.to}' references missing target Node '${targetNodeId}'.`,
          )
        }
      }
    }

    return conflicts
  }
}
