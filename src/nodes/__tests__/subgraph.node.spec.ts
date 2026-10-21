import { describe, it, expect, beforeEach } from 'vitest'
import { BaseGraph } from '../../core/base.graph'
import { createMathNode } from '../math.node'
import { createDisplayNode } from '../display.node'
import { createClockNode } from '../clock.node'
import { createSubgraphNode } from '../subgraph.node'
import { registerCoreNodes } from '../nodeLibrary'
import type { SerializedGraph } from '../../core/serialization'

describe('SubgraphNode Integration', () => {
  beforeEach(() => {
    registerCoreNodes()
  })

  it('should propagate data through a subgraph', async () => {
    const innerGraphData: SerializedGraph = {
      nodes: [
        { id: 'in-1', type: 'group-input', x: 0, y: 0, data: { name: 'A', type: 'number' } },
        { id: 'math-1', type: 'math-node', x: 100, y: 0, data: { operator: 'add', b: 10 } },
        {
          id: 'out-1',
          type: 'group-output',
          x: 200,
          y: 0,
          data: { name: 'Result', type: 'number' },
        },
      ],
      edges: [
        { from: 'in-1:value', to: 'math-1:a' },
        { from: 'math-1:result', to: 'out-1:value' },
      ],
    }

    const outerGraph = new BaseGraph()
    const mathOuter = createMathNode({
      id: 'outer-math',
      initialData: { a: 5, b: 0, operator: 'add' },
    })
    const subgraph = createSubgraphNode({
      id: 'sub-1',
      initialData: { graph: innerGraphData },
    })
    const display = createDisplayNode({ id: 'disp-1' })

    outerGraph.addNode(mathOuter)
    outerGraph.addNode(subgraph)
    outerGraph.addNode(display)

    outerGraph.addEdge('outer-math:result', 'sub-1:A')
    outerGraph.addEdge('sub-1:Result', 'disp-1:value')

    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))
    expect(display.getInput('value')).toBe(15)

    mathOuter.setInput('a', 20)
    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))
    expect(display.getInput('value')).toBe(30)
  })

  it('should react to internal changes in the subgraph', async () => {
    const innerGraphData: SerializedGraph = {
      nodes: [
        { id: 'in-1', type: 'group-input', x: 0, y: 0, data: { name: 'A', type: 'number' } },
        { id: 'math-1', type: 'math-node', x: 100, y: 0, data: { operator: 'add', b: 10 } },
        {
          id: 'out-1',
          type: 'group-output',
          x: 200,
          y: 0,
          data: { name: 'Result', type: 'number' },
        },
      ],
      edges: [
        { from: 'in-1:value', to: 'math-1:a' },
        { from: 'math-1:result', to: 'out-1:value' },
      ],
    }

    const outerGraph = new BaseGraph()
    const subgraph = createSubgraphNode({
      id: 'sub-1',
      initialData: { graph: innerGraphData },
    })
    const display = createDisplayNode({ id: 'disp-1' })

    outerGraph.addNode(subgraph)
    outerGraph.addNode(display)
    outerGraph.addEdge('sub-1:Result', 'disp-1:value')

    subgraph.setInput('A', 5)
    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))
    expect(display.getInput('value')).toBe(15)

    // oxlint-disable-next-line typescript/no-explicit-any
    const innerMath = (subgraph.state as any).innerGraph.nodes.find((n: any) => n.id === 'math-1')
    expect(innerMath).toBeDefined()
    innerMath.setInput('b', 50)
    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))
    expect(display.getInput('value')).toBe(55)
  })

  it('should run with a clock', async () => {
    const innerGraphData: SerializedGraph = {
      nodes: [
        { id: 'in-1', type: 'group-input', x: 0, y: 0, data: { name: 'In', type: 'number' } },
        { id: 'math-1', type: 'math-node', x: 100, y: 0, data: { operator: 'add', b: 1 } },
        { id: 'out-1', type: 'group-output', x: 200, y: 0, data: { name: 'Out', type: 'number' } },
      ],
      edges: [
        { from: 'in-1:value', to: 'math-1:a' },
        { from: 'math-1:result', to: 'out-1:value' },
      ],
    }

    const outerGraph = new BaseGraph()
    const clock = createClockNode({ id: 'clock-1' })
    const subgraph = createSubgraphNode({
      id: 'sub-1',
      initialData: { graph: innerGraphData },
    })
    const display = createDisplayNode({ id: 'disp-1' })

    outerGraph.addNode(clock)
    outerGraph.addNode(subgraph)
    outerGraph.addNode(display)

    outerGraph.addEdge('clock-1:tick', 'sub-1:In')
    outerGraph.addEdge('sub-1:Out', 'disp-1:value')

    await new Promise((resolve) => setTimeout(resolve, 200))

    const val = display.getInput('value')
    expect(typeof val).toBe('number')
    expect(val).toBeGreaterThan(0)

    clock.destroy()
  })
})
