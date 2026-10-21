import { BaseGraph } from './base.graph'
import { nodeRegistry, type AxonNodeRegistry } from './nodeRegistry'

export type SerializedNode = {
  id: string
  type: string
  x: number
  y: number
  data?: Record<string, unknown>
}

export type SerializedEdge = {
  from: string
  to: string
}

export type SerializedGraph = {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  zoom?: {
    k: number
    x: number
    y: number
    minZoom?: number
    maxZoom?: number
  }
}

/**
 * Loads a graph in headless mode (logic only, no UI/DOM).
 * Useful for server-side execution, web workers, and background runners.
 */
export function loadHeadlessGraph(
  data: SerializedGraph,
  registry: AxonNodeRegistry = nodeRegistry,
  globalData?: Record<string, unknown>,
): BaseGraph {
  const graph = new BaseGraph()
  if (globalData) {
    graph.globalData = globalData
  }

  // 1. Re-instantiate engines
  data.nodes.forEach((nodeData) => {
    const def = registry.safeGet(nodeData.type)
    if (def) {
      const engine = def.createEngine(
        { id: nodeData.id, initialData: nodeData.data },
        globalData,
      )
      engine.position = {
        x: typeof nodeData.x === 'number' ? nodeData.x : 0,
        y: typeof nodeData.y === 'number' ? nodeData.y : 0,
      }
      if (nodeData.data) {
        engine.data = {
          ...(typeof engine.data === 'object' && engine.data !== null ? engine.data : {}),
          ...nodeData.data,
        }
      }
      graph.addNode(engine)
    } else {
      console.warn(`Cannot load headless node: Type "${nodeData.type}" not registered.`)
    }
  })

  // 2. Rebuild edges
  data.edges.forEach((edge) => {
    graph.addEdge(edge.from, edge.to)
  })

  graph.flush()
  return graph
}

/**
 * Exports a headless BaseGraph instance to a JSON-compatible SerializedGraph structure
 * without any DOM dependencies.
 */
export function serializeHeadlessGraph(graph: BaseGraph): SerializedGraph {
  const nodes: SerializedNode[] = graph.nodes.map((node) => {
    const rawData =
      typeof node.data === 'object' && node.data !== null
        ? { ...(node.data as Record<string, unknown>) }
        : {}
    // Strip internal function callbacks if any
    for (const key of Object.keys(rawData)) {
      if (typeof rawData[key] === 'function' || key.startsWith('_')) {
        delete rawData[key]
      }
    }
    return {
      id: node.id,
      type: node.nodeType,
      x: node.position?.x ?? 0,
      y: node.position?.y ?? 0,
      ...(Object.keys(rawData).length > 0 ? { data: rawData } : {}),
    }
  })

  const edges: SerializedEdge[] = graph.edges.map(([from, to]) => ({
    from,
    to,
  }))

  return {
    nodes,
    edges,
  }
}

export const serializeGraph = serializeHeadlessGraph

/**
 * High-level utility to run a serialized graph once with specific inputs.
 * Returns a snapshot of all port values after propagation settles.
 */
export async function runGraphOnce(
  data: SerializedGraph,
  inputs: Record<string, unknown> = {},
  registry: AxonNodeRegistry = nodeRegistry,
): Promise<Record<string, unknown>> {
  const graph = loadHeadlessGraph(data, registry)

  Object.entries(inputs).forEach(([portId, val]) => {
    graph.setPortValue(portId, val)
  })

  await graph.settle()
  return graph.exportState()
}
