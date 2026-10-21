import { Result } from '@collidor/toolkit'

/**
 * Highly optimized, cycle-resilient Kahn's Topological Sorting algorithm.
 * Guarantees zero runtime TypeErrors on missing node lists or circular connections,
 * recovering gracefully from cycles instead of failing or entering infinite loops.
 */
export function kahnTopologicalSort(
  nodes: { id: string }[],
  edges: [string, string][],
): Result<{ result: string[]; adjList: Record<string, string[]> }> {
  const inDegree: Record<string, number> = {}
  const adjList: Record<string, string[]> = {}

  const queue: string[] = []
  const result: string[] = []

  // 1. Initialize structures safely
  for (const node of nodes) {
    inDegree[node.id] = 0
    adjList[node.id] = []
  }

  // 2. Map edges defensively: skip missing or uninitialized node keys and self-loops
  for (const edge of edges) {
    const from = edge[0]
    const to = edge[1]

    if (from === to) continue // Skip self-loops in DAG topological sorting

    if (adjList[from] !== undefined && adjList[to] !== undefined) {
      adjList[from].push(to)
      inDegree[to]!++
    }
  }

  // 3. Find beginning nodes (in-degree of 0)
  for (const node of nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id)
    }
  }

  // 4. Process topological extraction with automatic cycle recovery
  const visited = new Set<string>()

  while (visited.size < nodes.length) {
    const node = queue.shift()

    if (!node) {
      // Cycle detected: locate unvisited node with lowest in-degree
      let bestNode: string | null = null
      let minInDegree = Infinity

      for (const n of nodes) {
        if (!visited.has(n.id)) {
          const deg = inDegree[n.id] ?? 0
          if (deg < minInDegree) {
            minInDegree = deg
            bestNode = n.id
          }
        }
      }

      if (!bestNode) {
        break
      }

      inDegree[bestNode] = 0
      queue.push(bestNode)
      continue
    }

    if (visited.has(node)) {
      continue
    }

    result.push(node)
    visited.add(node)

    const neighbors = adjList[node] || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && inDegree[neighbor] !== undefined) {
        inDegree[neighbor]--
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor)
        }
      }
    }
  }

  return Result.ok({
    result,
    adjList,
  })
}
