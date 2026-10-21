import { describe, it, expect } from 'vitest'
import { GraphPatcher, type FeatureFlagBranch } from '../patcher'
import type { SerializedGraph } from '../../core/serialization'

describe('GraphPatcher (In-Memory Feature Flag Hot-Patching)', () => {
  it('applies ADD_NODE, UPDATE_NODE, and ADD_EDGE patches without mutating base graph', () => {
    const baseGraph: SerializedGraph = {
      nodes: [
        { id: 'node_math', type: 'math', x: 0, y: 0, data: { operation: 'add' } },
        { id: 'node_display', type: 'display', x: 200, y: 0, data: {} },
      ],
      edges: [{ from: 'node_math:result', to: 'node_display:input' }],
    }

    const branch: FeatureFlagBranch = {
      flagId: 'feature_multiplier',
      targetGraphId: 'graph_1',
      baseVersion: 1,
      status: 'ACTIVE',
      patches: [
        {
          op: 'ADD_NODE',
          node: { id: 'node_mul', type: 'math', x: 100, y: 50, data: { operation: 'multiply' } },
        },
        {
          op: 'UPDATE_NODE',
          nodeId: 'node_math',
          data: { operation: 'subtract' },
        },
        {
          op: 'ADD_EDGE',
          edge: { from: 'node_math:result', to: 'node_mul:a' },
        },
      ],
    }

    const patched = GraphPatcher.apply(baseGraph, branch)

    // Base graph is preserved
    expect(baseGraph.nodes).toHaveLength(2)
    expect(baseGraph.nodes[0].data?.operation).toBe('add')

    // Patched graph has modifications
    expect(patched.nodes).toHaveLength(3)
    expect(patched.nodes.find((n) => n.id === 'node_math')?.data?.operation).toBe('subtract')
    expect(patched.nodes.find((n) => n.id === 'node_mul')).toBeDefined()
    expect(patched.edges).toHaveLength(2)
  })

  it('automatically prunes orphaned edges when a node is deleted in patch', () => {
    const baseGraph: SerializedGraph = {
      nodes: [
        { id: 'node_a', type: 'constant', x: 0, y: 0 },
        { id: 'node_b', type: 'display', x: 200, y: 0 },
      ],
      edges: [{ from: 'node_a:value', to: 'node_b:input' }],
    }

    const branch: FeatureFlagBranch = {
      flagId: 'feature_clean',
      targetGraphId: 'graph_1',
      baseVersion: 1,
      status: 'ACTIVE',
      patches: [{ op: 'DELETE_NODE', nodeId: 'node_a' }],
    }

    const patched = GraphPatcher.apply(baseGraph, branch)
    expect(patched.nodes).toHaveLength(1)
    expect(patched.edges).toHaveLength(0) // Orphaned edge pruned
  })
})
