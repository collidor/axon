import { describe, it, expect } from 'vitest'
import { computeBoundedLayers } from '../boundedLayering'

describe('boundedLayering', () => {
  it('formats 9 independent nodes into a balanced 3x3 square disposition', () => {
    const nodes = Array.from({ length: 9 }, (_, i) => ({ id: `node_${i}` }))
    const edges: [string, string][] = []

    const result = computeBoundedLayers(nodes, edges, { targetAspectRatio: 1.0 })
    expect(result.success).toBe(true)
    if (!result.success) return

    const { layers, maxLayer } = result.value
    // 9 nodes with capacity ceil(sqrt(9)) = 3 means 3 layers: 0, 1, 2
    expect(maxLayer).toBe(2)

    const layerCounts = new Map<number, number>()
    for (const layer of layers.values()) {
      layerCounts.set(layer, (layerCounts.get(layer) ?? 0) + 1)
    }

    expect(layerCounts.get(0)).toBe(3)
    expect(layerCounts.get(1)).toBe(3)
    expect(layerCounts.get(2)).toBe(3)
  })

  it('strictly preserves directed dependency precedence while bounding width', () => {
    // 4 nodes: A -> B -> C -> D (must be in 4 distinct layers: 0, 1, 2, 3)
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }]
    const edges: [string, string][] = [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
    ]

    const result = computeBoundedLayers(nodes, edges, { maxNodesPerLayer: 2 })
    expect(result.success).toBe(true)
    if (!result.success) return

    const { layers } = result.value
    expect(layers.get('A')).toBe(0)
    expect(layers.get('B')).toBe(1)
    expect(layers.get('C')).toBe(2)
    expect(layers.get('D')).toBe(3)
  })

  it('balances a 1-to-many star graph into bounded layers', () => {
    // Root A points to B, C, D, E, F (6 nodes total)
    // sqrt(6) = 3
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }, { id: 'F' }]
    const edges: [string, string][] = [
      ['A', 'B'],
      ['A', 'C'],
      ['A', 'D'],
      ['A', 'E'],
      ['A', 'F'],
    ]

    const result = computeBoundedLayers(nodes, edges, { maxNodesPerLayer: 3 })
    expect(result.success).toBe(true)
    if (!result.success) return

    const { layers } = result.value
    // A must be in layer 0
    expect(layers.get('A')).toBe(0)

    // Children are distributed: 3 in layer 1, 2 in layer 2
    const layer1Nodes = nodes.filter((n) => layers.get(n.id) === 1)
    const layer2Nodes = nodes.filter((n) => layers.get(n.id) === 2)
    expect(layer1Nodes.length).toBe(3)
    expect(layer2Nodes.length).toBe(2)
  })

  it('scales layer capacity when rowHeight is significantly higher than columnWidth', () => {
    // 8 independent nodes with rowHeight: 600px and columnWidth: 300px
    // dimRatio = 300 / 600 = 0.5
    // capacity = ceil(sqrt(8 * 0.5)) = ceil(2) = 2 nodes per column
    // This results in 4 columns of 2 nodes, yielding a 1200px x 1200px square physical disposition
    const nodes = Array.from({ length: 8 }, (_, i) => ({ id: `table_${i}` }))
    const edges: [string, string][] = []

    const result = computeBoundedLayers(nodes, edges, {
      targetAspectRatio: 1.0,
      columnWidth: 300,
      rowHeight: 600,
    })
    expect(result.success).toBe(true)
    if (!result.success) return

    const { layers, maxLayer } = result.value
    expect(maxLayer).toBe(3) // 4 layers: 0, 1, 2, 3

    const layerCounts = new Map<number, number>()
    for (const layer of layers.values()) {
      layerCounts.set(layer, (layerCounts.get(layer) ?? 0) + 1)
    }

    for (let l = 0; l <= 3; l++) {
      expect(layerCounts.get(l)).toBe(2)
    }
  })
})
