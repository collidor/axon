import { describe, it, expect } from 'vitest'
import {
  BaseGraph,
  registerCoreNodes,
  serializeHeadlessGraph,
  loadHeadlessGraph,
  nodeRegistry,
  NODE_TYPES,
  type SerializedGraph,
} from '../headless'

describe('Headless Graph Serialization and Deserialization', () => {
  it('builds, serializes, encodes to JSON, and reconstructs a functional headless graph', async () => {
    registerCoreNodes()

    const graph = new BaseGraph()

    // Create Math Node 1 (Add)
    const mathDef = nodeRegistry.get(NODE_TYPES.MATH)!
    const node1 = mathDef.createEngine!({
      id: 'math_add_1',
      initialData: { a: 10, b: 20, operator: 'ADD' },
    })
    node1.position = { x: 50, y: 100 }
    graph.addNode(node1)

    // Create Math Node 2 (Multiply)
    const node2 = mathDef.createEngine!({
      id: 'math_mul_2',
      initialData: { b: 3, operator: 'MULTIPLY' },
    })
    node2.position = { x: 300, y: 150 }
    graph.addNode(node2)

    // Connect node1:result -> node2:a
    graph.addEdge('math_add_1:result', 'math_mul_2:a')

    // Settle computation
    await graph.settle()
    expect(node1.getOutput('result')).toBe(30)
    expect(node2.getOutput('result')).toBe(90)

    // 1. Serialize graph
    const serialized = serializeHeadlessGraph(graph)

    expect(serialized.nodes).toHaveLength(2)
    expect(serialized.edges).toHaveLength(1)
    expect(serialized.edges[0]).toEqual({
      from: 'math_add_1:result',
      to: 'math_mul_2:a',
    })

    const serializedNode1 = serialized.nodes.find((n) => n.id === 'math_add_1')!
    expect(serializedNode1.x).toBe(50)
    expect(serializedNode1.y).toBe(100)
    expect(serializedNode1.data?.operator).toBe('ADD')

    // 2. JSON round-trip stringification
    const jsonString = JSON.stringify(serialized)
    const parsedData: SerializedGraph = JSON.parse(jsonString)

    // 3. Deserialize into a new headless graph via BaseGraph.deserializeHeadlessGraph
    const restoredGraph = BaseGraph.deserializeHeadlessGraph(parsedData)

    expect(restoredGraph.nodes).toHaveLength(2)
    expect(restoredGraph.edges).toHaveLength(1)

    const restoredNode1 = restoredGraph.getNode('math_add_1')!
    const restoredNode2 = restoredGraph.getNode('math_mul_2')!

    expect(restoredNode1).toBeDefined()
    expect(restoredNode2).toBeDefined()
    expect(restoredNode1.position).toEqual({ x: 50, y: 100 })
    expect(restoredNode2.position).toEqual({ x: 300, y: 150 })

    // Change input on restored graph and verify execution
    restoredNode1.setInput('a', 5)
    await restoredGraph.settle()

    expect(restoredNode1.getOutput('result')).toBe(25)
    expect(restoredNode2.getOutput('result')).toBe(75)
  })

  it('serializes via instance method graph.serializeHeadlessGraph() and deserializes via loadHeadlessGraph()', async () => {
    registerCoreNodes()

    const graph = new BaseGraph()
    const mathDef = nodeRegistry.get(NODE_TYPES.MATH)!
    const nodeA = mathDef.createEngine!({
      id: 'calc_a',
      initialData: { a: 4, b: 6, operator: 'ADD' },
    })
    nodeA.position = { x: 120, y: 80 }
    graph.addNode(nodeA)

    const snapshot = graph.serializeHeadlessGraph()
    expect(snapshot.nodes[0].id).toBe('calc_a')
    expect(snapshot.nodes[0].x).toBe(120)

    const reloaded = loadHeadlessGraph(snapshot)
    const retrieved = reloaded.getNode('calc_a')
    expect(retrieved).toBeDefined()
    expect(retrieved?.position).toEqual({ x: 120, y: 80 })
  })
})
