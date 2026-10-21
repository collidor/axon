import { describe, it, expect, beforeEach } from 'vitest'
import { BaseGraph } from '../../core/base.graph'
import { createMathNode } from '../math.node'
import { createDisplayNode } from '../display.node'
import { createClockNode } from '../clock.node'
import {
  createSubgraphNode,
  createGroupInputNode,
  createGroupOutputNode,
  syncSubgraphPorts,
} from '../subgraph.node'
import { registerCoreNodes } from '../nodeLibrary'
import type { SerializedGraph } from '../../core/serialization'

describe('Subgraph Headless & Layer Navigation Execution', () => {
  beforeEach(() => {
    registerCoreNodes()
  })

  it('runs outer graph headlessly and continuously propagates inputs into the inner graph', async () => {
    const innerGraphData: SerializedGraph = {
      nodes: [
        { id: 'in-1', type: 'group-input', x: 0, y: 0, data: { name: 'A', type: 'number' } },
        { id: 'math-inner', type: 'math-node', x: 100, y: 0, data: { operator: 'ADD', b: 100 } },
        {
          id: 'out-1',
          type: 'group-output',
          x: 200,
          y: 0,
          data: { name: 'Result', type: 'number' },
        },
      ],
      edges: [
        { from: 'in-1:value', to: 'math-inner:a' },
        { from: 'math-inner:result', to: 'out-1:value' },
      ],
    }

    const outerGraph = new BaseGraph()
    const outerMath = createMathNode({
      id: 'outer-math',
      initialData: { a: 10, b: 5, operator: 'ADD' },
    })
    const subNode = createSubgraphNode({
      id: 'sub-1',
      initialData: { graph: innerGraphData },
    })
    const outerDisplay = createDisplayNode({ id: 'outer-disp' })

    outerGraph.addNode(outerMath)
    outerGraph.addNode(subNode)
    outerGraph.addNode(outerDisplay)

    outerGraph.addEdge('outer-math:result', 'sub-1:A')
    outerGraph.addEdge('sub-1:Result', 'outer-disp:value')

    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))

    expect(outerDisplay.getInput('value')).toBe(115)

    // oxlint-disable-next-line typescript/no-explicit-any
    const innerEngine = (subNode.state as any).innerGraph as BaseGraph
    expect(innerEngine).toBeDefined()
    const innerMath = innerEngine.getNode('math-inner')
    expect(innerMath?.getOutput('result')).toBe(115)

    outerMath.setInput('a', 50)
    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))

    expect(innerMath?.getOutput('result')).toBe(155)
    expect(outerDisplay.getInput('value')).toBe(155)

    innerMath?.setInput('b', 200)
    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))

    expect(innerMath?.getOutput('result')).toBe(255)
    expect(outerDisplay.getInput('value')).toBe(255)
  })

  it('synchronizes dynamically added GroupInput and GroupOutput nodes with SubgraphNode ports', async () => {
    const innerGraphData: SerializedGraph = {
      nodes: [
        { id: 'in-1', type: 'group-input', x: 0, y: 0, data: { name: 'A', type: 'number' } },
        { id: 'out-1', type: 'group-output', x: 200, y: 0, data: { name: 'Out1', type: 'number' } },
      ],
      edges: [{ from: 'in-1:value', to: 'out-1:value' }],
    }

    const outerGraph = new BaseGraph()
    const subNode = createSubgraphNode({
      id: 'sub-1',
      initialData: { graph: innerGraphData },
    })

    outerGraph.addNode(subNode)
    expect(subNode.inputNames).toContain('A')
    expect(subNode.outputNames).toContain('Out1')

    // oxlint-disable-next-line typescript/no-explicit-any
    const innerEngine = (subNode.state as any).innerGraph as BaseGraph

    const in2 = createGroupInputNode({
      id: 'in-2',
      initialData: { name: 'B', type: 'number' },
    })
    const out2 = createGroupOutputNode({
      id: 'out-2',
      initialData: { name: 'Out2', type: 'number' },
    })

    innerEngine.addNode(in2)
    innerEngine.addNode(out2)
    innerEngine.addEdge('in-2:value', 'out-2:value')

    // oxlint-disable-next-line typescript/no-explicit-any
    syncSubgraphPorts(subNode as any)

    expect(subNode.inputNames).toContain('A')
    expect(subNode.inputNames).toContain('B')
    expect(subNode.outputNames).toContain('Out1')
    expect(subNode.outputNames).toContain('Out2')

    const display2 = createDisplayNode({ id: 'disp-2' })
    outerGraph.addNode(display2)
    outerGraph.addEdge('sub-1:Out2', 'disp-2:value')

    subNode.setInput('B', 42)
    await outerGraph.settle()
    await new Promise((r) => setTimeout(r, 10))

    expect(display2.getInput('value')).toBe(42)
  })

  it('supports multiple nested subgraph layers (root -> sub1 -> sub2)', async () => {
    const deepestGraph: SerializedGraph = {
      nodes: [
        {
          id: 'deep-in',
          type: 'group-input',
          x: 0,
          y: 0,
          data: { name: 'DeepIn', type: 'number' },
        },
        { id: 'deep-math', type: 'math-node', x: 100, y: 0, data: { operator: 'MULTIPLY', b: 3 } },
        {
          id: 'deep-out',
          type: 'group-output',
          x: 200,
          y: 0,
          data: { name: 'DeepOut', type: 'number' },
        },
      ],
      edges: [
        { from: 'deep-in:value', to: 'deep-math:a' },
        { from: 'deep-math:result', to: 'deep-out:value' },
      ],
    }

    const midGraph: SerializedGraph = {
      nodes: [
        { id: 'mid-in', type: 'group-input', x: 0, y: 0, data: { name: 'MidIn', type: 'number' } },
        { id: 'sub-deep', type: 'subgraph-node', x: 100, y: 0, data: { graph: deepestGraph } },
        {
          id: 'mid-out',
          type: 'group-output',
          x: 200,
          y: 0,
          data: { name: 'MidOut', type: 'number' },
        },
      ],
      edges: [
        { from: 'mid-in:value', to: 'sub-deep:DeepIn' },
        { from: 'sub-deep:DeepOut', to: 'mid-out:value' },
      ],
    }

    const rootGraph = new BaseGraph()
    const rootSub = createSubgraphNode({
      id: 'sub-mid',
      initialData: { graph: midGraph },
    })
    const rootDisplay = createDisplayNode({ id: 'root-disp' })

    rootGraph.addNode(rootSub)
    rootGraph.addNode(rootDisplay)
    rootGraph.addEdge('sub-mid:MidOut', 'root-disp:value')

    rootSub.setInput('MidIn', 7)
    await rootGraph.settle()
    await new Promise((r) => setTimeout(r, 10))

    expect(rootDisplay.getInput('value')).toBe(21)
  })

  it('runs clock in outer graph headlessly while inner graph receives ticks', async () => {
    const innerGraphData: SerializedGraph = {
      nodes: [
        { id: 'in-1', type: 'group-input', x: 0, y: 0, data: { name: 'TickIn', type: 'number' } },
        {
          id: 'out-1',
          type: 'group-output',
          x: 200,
          y: 0,
          data: { name: 'TickOut', type: 'number' },
        },
      ],
      edges: [{ from: 'in-1:value', to: 'out-1:value' }],
    }

    const outerGraph = new BaseGraph()
    const clock = createClockNode({ id: 'outer-clock', initialData: { hz: 50 } })
    const subNode = createSubgraphNode({
      id: 'sub-1',
      initialData: { graph: innerGraphData },
    })
    const display = createDisplayNode({ id: 'disp' })

    outerGraph.addNode(clock)
    outerGraph.addNode(subNode)
    outerGraph.addNode(display)

    outerGraph.addEdge('outer-clock:tick', 'sub-1:TickIn')
    outerGraph.addEdge('sub-1:TickOut', 'disp:value')

    await new Promise((r) => setTimeout(r, 150))

    const val = display.getInput('value')
    expect(typeof val).toBe('number')
    expect(val).toBeGreaterThan(0)

    clock.destroy()
  })

  it('regularly propagates 2Hz clock ticks from outer graph into inner graph nodes', async () => {
    const innerGraphData: SerializedGraph = {
      nodes: [
        { id: 'in-1', type: 'group-input', x: 0, y: 0, data: { name: 'ClockIn', type: 'number' } },
        { id: 'inner-disp', type: 'display-node', x: 200, y: 0 },
      ],
      edges: [{ from: 'in-1:value', to: 'inner-disp:value' }],
    }

    const outerGraph = new BaseGraph()
    const clock = createClockNode({ id: 'outer-clock', initialData: { hz: 2 } })
    const subNode = createSubgraphNode({
      id: 'sub-1',
      initialData: { graph: innerGraphData },
    })

    outerGraph.addNode(clock)
    outerGraph.addNode(subNode)
    outerGraph.addEdge('outer-clock:tick', 'sub-1:ClockIn')

    // oxlint-disable-next-line typescript/no-explicit-any
    const innerEngine = (subNode.state as any).innerGraph as BaseGraph
    const innerDisp = innerEngine.getNode('inner-disp')

    const receivedTicks: number[] = []
    innerDisp?.subscribeInput((name, val) => {
      if (name === 'value' && typeof val === 'number') {
        receivedTicks.push(val)
      }
    })

    // Wait for ~1150ms (at 2Hz / 500ms interval, should receive >= 2 ticks)
    await new Promise((r) => setTimeout(r, 1150))

    expect(receivedTicks.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < receivedTicks.length; i++) {
      expect(receivedTicks[i]!).toBeGreaterThan(receivedTicks[i - 1]!)
    }

    clock.destroy()
  })
})
