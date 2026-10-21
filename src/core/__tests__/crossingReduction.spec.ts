import { describe, it, expect } from 'vitest'
import {
  countLayerCrossings,
  countTotalCrossings,
  barycenterCrossingReduction,
} from '../crossingReduction'

describe('crossingReduction', () => {
  it('correctly counts edge crossings between two layers', () => {
    // Layer 1: [A, B]
    // Layer 2: [C, D]
    // Edges: A -> D, B -> C (forming an X)
    const layer1 = ['A', 'B']
    const layer2 = ['C', 'D']
    const childrenMap = new Map<string, Set<string>>([
      ['A', new Set(['D'])],
      ['B', new Set(['C'])],
    ])

    expect(countLayerCrossings(layer1, layer2, childrenMap)).toBe(1)

    // Parallel edges: A -> C, B -> D (0 crossings)
    const childrenMapParallel = new Map<string, Set<string>>([
      ['A', new Set(['C'])],
      ['B', new Set(['D'])],
    ])
    expect(countLayerCrossings(layer1, layer2, childrenMapParallel)).toBe(0)
  })

  it('eliminates crossing by reordering nodes with Barycenter heuristic', () => {
    // Initial crossed state:
    // Layer 0: [u1, u2]
    // Layer 1: [v1, v2]
    // u1 -> v2, u2 -> v1
    const layers = [
      ['u1', 'u2'],
      ['v1', 'v2'],
    ]
    const parentsMap = new Map<string, Set<string>>([
      ['v1', new Set(['u2'])],
      ['v2', new Set(['u1'])],
    ])
    const childrenMap = new Map<string, Set<string>>([
      ['u1', new Set(['v2'])],
      ['u2', new Set(['v1'])],
    ])

    expect(countTotalCrossings(layers, childrenMap)).toBe(1)

    const reducedLayers = barycenterCrossingReduction(layers, parentsMap, childrenMap)

    // After reduction, v2 should be before v1, eliminating the crossing
    expect(countTotalCrossings(reducedLayers, childrenMap)).toBe(0)
    expect(reducedLayers[1]).toEqual(['v2', 'v1'])
  })

  it('handles multi-layer DAGs and significantly reduces crossings', () => {
    // Layer 0: [n0, n1, n2]
    // Layer 1: [n3, n4, n5]
    // Layer 2: [n6, n7, n8]
    // Inverse connections intentionally creating many crossings
    const layers = [
      ['n0', 'n1', 'n2'],
      ['n3', 'n4', 'n5'],
      ['n6', 'n7', 'n8'],
    ]

    const parentsMap = new Map<string, Set<string>>([
      ['n3', new Set(['n2'])],
      ['n4', new Set(['n1'])],
      ['n5', new Set(['n0'])],
      ['n6', new Set(['n5'])],
      ['n7', new Set(['n4'])],
      ['n8', new Set(['n3'])],
    ])

    const childrenMap = new Map<string, Set<string>>([
      ['n0', new Set(['n5'])],
      ['n1', new Set(['n4'])],
      ['n2', new Set(['n3'])],
      ['n3', new Set(['n8'])],
      ['n4', new Set(['n7'])],
      ['n5', new Set(['n6'])],
    ])

    const initialCrossings = countTotalCrossings(layers, childrenMap)
    expect(initialCrossings).toBeGreaterThan(0)

    const resolved = barycenterCrossingReduction(layers, parentsMap, childrenMap)
    const finalCrossings = countTotalCrossings(resolved, childrenMap)

    expect(finalCrossings).toBe(0)
  })
})
