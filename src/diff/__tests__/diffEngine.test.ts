import { describe, it, expect } from 'vitest'
import { GraphDiffEngine } from '../diffEngine'
import type { FeatureFlagBranch } from '../patcher'
import type { SerializedGraph } from '../../core/serialization'

describe('GraphDiffEngine (Rebase Conflict Detection)', () => {
  it('detects no conflicts when patches align with mutated main graph', () => {
    const mainGraph: SerializedGraph = {
      nodes: [
        { id: 'node_1', type: 'constant', x: 0, y: 0 },
        { id: 'node_2', type: 'display', x: 100, y: 0 },
      ],
      edges: [],
    }

    const branch: FeatureFlagBranch = {
      flagId: 'clean_feature',
      targetGraphId: 'graph_1',
      baseVersion: 1,
      status: 'ACTIVE',
      patches: [{ op: 'UPDATE_NODE', nodeId: 'node_1', data: { value: 42 } }],
    }

    const conflicts = GraphDiffEngine.detectConflicts(mainGraph, branch)
    expect(conflicts).toHaveLength(0)
  })

  it('detects conflicts when patch targets a deleted node in Main', () => {
    const mainGraphAfterDelete: SerializedGraph = {
      nodes: [{ id: 'node_2', type: 'display', x: 100, y: 0 }],
      edges: [],
    }

    const branch: FeatureFlagBranch = {
      flagId: 'broken_feature',
      targetGraphId: 'graph_1',
      baseVersion: 1,
      status: 'ACTIVE',
      patches: [{ op: 'UPDATE_NODE', nodeId: 'node_1', data: { value: 99 } }],
    }

    const conflicts = GraphDiffEngine.detectConflicts(mainGraphAfterDelete, branch)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toContain("targets Node 'node_1', which no longer exists in Main")
  })

  it('detects conflicts when added edge references a missing node', () => {
    const mainGraph: SerializedGraph = {
      nodes: [{ id: 'node_1', type: 'constant', x: 0, y: 0 }],
      edges: [],
    }

    const branch: FeatureFlagBranch = {
      flagId: 'missing_edge_target',
      targetGraphId: 'graph_1',
      baseVersion: 1,
      status: 'ACTIVE',
      patches: [{ op: 'ADD_EDGE', edge: { from: 'node_1:out', to: 'node_phantom:in' } }],
    }

    const conflicts = GraphDiffEngine.detectConflicts(mainGraph, branch)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toContain("missing target Node 'node_phantom'")
  })
})
