import { describe, it, expect } from 'vitest'
import { BaseGraph } from '../../core/base.graph'
import { BaseNode } from '../../core/base.node'
import { loadHeadlessGraph, type SerializedGraph } from '../../core/serialization'
import { registerCoreNodes } from '../nodeLibrary'

describe('BaseGraph - State Persistence', () => {
  it('should maintain operator state across multiple value updates', async () => {
    const graph = new BaseGraph()
    const mathNode = new BaseNode({
      id: 'math',
      inputs: { a: Number, b: Number, operator: String },
      outputs: { result: Number },
      onInputChange: (_name, _val, { inputs, emitOutput }) => {
        const a = inputs.a ?? 0
        const b = inputs.b ?? 0
        const op = inputs.operator ?? 'ADD'
        if (op === 'SUBTRACT') emitOutput('result', a - b)
        else emitOutput('result', a + b)
      },
    })

    graph.addNode(mathNode)

    // 1. Set initial values
    graph.setPortValue('math:a', 10)
    graph.setPortValue('math:b', 5)
    graph.setPortValue('math:operator', 'SUBTRACT')

    // Wait for microtask flush
    await Promise.resolve()
    expect(mathNode.getOutput('result')).toBe(5)

    // 2. Simulate a "tick" (update 'a')
    graph.setPortValue('math:a', 20)
    await Promise.resolve()

    // If it reverts to ADD, result will be 25. If it stays SUBTRACT, result will be 15.
    expect(mathNode.getOutput('result')).toBe(15)
  })

  it('should sync direct node input updates back to the graph', async () => {
    const graph = new BaseGraph()
    const node = new BaseNode({
      id: 'test-node',
      inputs: { val: Number },
      outputs: {},
    })

    graph.addNode(node)

    // 1. Update input directly on the node (simulating UI interaction)
    node.setInput('val', 42)

    // 2. The graph should now have this value in its port storage
    expect(graph.getPortValue('test-node:val')).toBe(42)

    // 3. Verify that the graph doesn't overwrite it with undefined on next flush
    graph.setPortValue('some-other-port', 1)
    await Promise.resolve()

    expect(node.getInput('val')).toBe(42)
  })

  it('should push initial node inputs to the graph on addNode', () => {
    const graph = new BaseGraph()
    const node = new BaseNode({
      id: 'init-node',
      inputs: { a: Number },
      outputs: {},
    })

    node.setInput('a', 100)
    graph.addNode(node)

    expect(graph.getPortValue('init-node:a')).toBe(100)
  })

  it('should load a full graph in headless mode and execute logic', async () => {
    registerCoreNodes()

    const data: SerializedGraph = {
      nodes: [
        { id: 'n1', type: 'clock-node', x: 0, y: 0 },
        { id: 'n2', type: 'math-node', x: 0, y: 0, data: { operator: 'MULTIPLY', b: 5 } },
      ],
      edges: [{ from: 'n1:tick', to: 'n2:a' }],
    }

    const graph = loadHeadlessGraph(data)

    expect(graph.getPortValue('n2:b')).toBe(5)

    graph.setPortValue('n1:tick', 10)

    await Promise.resolve()

    expect(graph.getPortValue('n2:result')).toBe(50)
  })
})
