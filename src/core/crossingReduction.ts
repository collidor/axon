/**
 * Crossing reduction algorithms for layered directed acyclic graphs (Sugiyama framework).
 * Minimizes edge crossings between adjacent layers using alternating Barycenter sweeps
 * and adjacent-exchange sifting.
 */

/**
 * Counts the number of edge crossings between two adjacent layers.
 */
export function countLayerCrossings(
  layer1: string[],
  layer2: string[],
  childrenMap: Map<string, Set<string>>,
): number {
  const pos2 = new Map<string, number>()
  for (let i = 0; i < layer2.length; i++) {
    pos2.set(layer2[i]!, i)
  }

  // Collect all edges from layer1 to layer2 in order of layer1
  const edges: [number, number][] = []
  for (let i = 0; i < layer1.length; i++) {
    const u = layer1[i]!
    const children = childrenMap.get(u)
    if (!children) continue
    for (const v of children) {
      const vPos = pos2.get(v)
      if (vPos !== undefined) {
        edges.push([i, vPos])
      }
    }
  }

  let crossings = 0
  for (let i = 0; i < edges.length; i++) {
    const e1 = edges[i]!
    for (let j = i + 1; j < edges.length; j++) {
      const e2 = edges[j]!
      // If e1 started strictly before e2, it crosses if e1 ends strictly after e2
      if (e1[0] < e2[0] && e1[1] > e2[1]) {
        crossings++
      } else if (e1[0] > e2[0] && e1[1] < e2[1]) {
        crossings++
      }
    }
  }

  return crossings
}

/**
 * Counts total edge crossings across all adjacent layers.
 */
export function countTotalCrossings(
  layers: string[][],
  childrenMap: Map<string, Set<string>>,
): number {
  let total = 0
  for (let i = 0; i < layers.length - 1; i++) {
    total += countLayerCrossings(layers[i]!, layers[i + 1]!, childrenMap)
  }
  return total
}

/**
 * Reorders nodes within each layer using alternating Barycenter heuristic sweeps
 * followed by adjacent-exchange passes to minimize edge crossings.
 */
export function barycenterCrossingReduction(
  layers: string[][],
  parentsMap: Map<string, Set<string>>,
  childrenMap: Map<string, Set<string>>,
  passes = 6,
): string[][] {
  if (layers.length <= 1) return layers.map((layer) => [...layer])

  // Deep clone layers
  const currentLayers: string[][] = layers.map((layer) => [...layer])

  let bestLayers = currentLayers.map((layer) => [...layer])
  let minCrossings = countTotalCrossings(bestLayers, childrenMap)

  for (let pass = 0; pass < passes; pass++) {
    const isDownward = pass % 2 === 0

    if (isDownward) {
      // Downward sweep: layer 1 -> maxLayer
      for (let l = 1; l < currentLayers.length; l++) {
        const prevLayer = currentLayers[l - 1]!
        const prevPosMap = new Map<string, number>()
        for (let i = 0; i < prevLayer.length; i++) {
          prevPosMap.set(prevLayer[i]!, i)
        }

        const currLayer = currentLayers[l]!
        const barycenters = new Map<string, number>()

        currLayer.forEach((nodeId, origIdx) => {
          const parents = parentsMap.get(nodeId)
          if (!parents || parents.size === 0) {
            barycenters.set(nodeId, origIdx)
            return
          }

          let sum = 0
          let count = 0
          for (const p of parents) {
            const pPos = prevPosMap.get(p)
            if (pPos !== undefined) {
              sum += pPos
              count++
            }
          }

          if (count > 0) {
            barycenters.set(nodeId, sum / count)
          } else {
            barycenters.set(nodeId, origIdx)
          }
        })

        currLayer.sort((a, b) => {
          const bA = barycenters.get(a) ?? 0
          const bB = barycenters.get(b) ?? 0
          if (bA !== bB) return bA - bB

          // If barycenters match, prioritize nodes that actually have connected parents over disconnected nodes
          const pA = parentsMap.get(a)?.size ?? 0
          const pB = parentsMap.get(b)?.size ?? 0
          if (pA !== pB) return pB - pA

          return (currentLayers[l]!.indexOf(a) ?? 0) - (currentLayers[l]!.indexOf(b) ?? 0)
        })
      }
    } else {
      // Upward sweep: layer maxLayer - 1 -> 0
      for (let l = currentLayers.length - 2; l >= 0; l--) {
        const nextLayer = currentLayers[l + 1]!
        const nextPosMap = new Map<string, number>()
        for (let i = 0; i < nextLayer.length; i++) {
          nextPosMap.set(nextLayer[i]!, i)
        }

        const currLayer = currentLayers[l]!
        const barycenters = new Map<string, number>()

        currLayer.forEach((nodeId, origIdx) => {
          const children = childrenMap.get(nodeId)
          if (!children || children.size === 0) {
            barycenters.set(nodeId, origIdx)
            return
          }

          let sum = 0
          let count = 0
          for (const c of children) {
            const cPos = nextPosMap.get(c)
            if (cPos !== undefined) {
              sum += cPos
              count++
            }
          }

          if (count > 0) {
            barycenters.set(nodeId, sum / count)
          } else {
            barycenters.set(nodeId, origIdx)
          }
        })

        currLayer.sort((a, b) => {
          const bA = barycenters.get(a) ?? 0
          const bB = barycenters.get(b) ?? 0
          if (bA !== bB) return bA - bB

          // If barycenters match, prioritize nodes that actually have connected children over disconnected nodes
          const cA = childrenMap.get(a)?.size ?? 0
          const cB = childrenMap.get(b)?.size ?? 0
          if (cA !== cB) return cB - cA

          return (currentLayers[l]!.indexOf(a) ?? 0) - (currentLayers[l]!.indexOf(b) ?? 0)
        })
      }
    }

    // Check if current pass improved crossing count
    const currentCrossings = countTotalCrossings(currentLayers, childrenMap)
    if (currentCrossings <= minCrossings) {
      minCrossings = currentCrossings
      bestLayers = currentLayers.map((layer) => [...layer])
      if (minCrossings === 0 && pass >= 1) break
    }
  }

  // Adjacent exchange (sifting) pass on bestLayers to resolve local inversions
  let improved = true
  let siftIterations = 0
  while (improved && siftIterations < 3 && minCrossings > 0) {
    improved = false
    siftIterations++

    for (let l = 0; l < bestLayers.length; l++) {
      const layer = bestLayers[l]!
      for (let i = 0; i < layer.length - 1; i++) {
        // Compute local crossings before swap
        const beforeCrossings =
          (l > 0 ? countLayerCrossings(bestLayers[l - 1]!, layer, childrenMap) : 0) +
          (l < bestLayers.length - 1
            ? countLayerCrossings(layer, bestLayers[l + 1]!, childrenMap)
            : 0)

        // Swap adjacent nodes
        const temp = layer[i]!
        layer[i] = layer[i + 1]!
        layer[i + 1] = temp

        const afterCrossings =
          (l > 0 ? countLayerCrossings(bestLayers[l - 1]!, layer, childrenMap) : 0) +
          (l < bestLayers.length - 1
            ? countLayerCrossings(layer, bestLayers[l + 1]!, childrenMap)
            : 0)

        if (afterCrossings < beforeCrossings) {
          improved = true
          minCrossings = countTotalCrossings(bestLayers, childrenMap)
        } else {
          // Revert swap
          layer[i + 1] = layer[i]!
          layer[i] = temp
        }
      }
    }
  }

  return bestLayers
}
