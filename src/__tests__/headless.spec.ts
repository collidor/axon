import { describe, it, expect } from 'vitest'
import {
  BaseGraph,
  BaseNode,
  registerCoreNodes,
  NODE_TYPES,
  AUDIO_NODE_TYPES,
  nodeRegistry,
  compileToFunction,
  SelectionManager,
} from '../headless'

describe('Headless Zero-DOM Axon Runtime', () => {
  it('registers core node engines without registering web components', () => {
    registerCoreNodes()
    expect(nodeRegistry.has(NODE_TYPES.MATH)).toBe(true)
    expect(nodeRegistry.has(NODE_TYPES.CLOCK)).toBe(true)
    expect(nodeRegistry.has(AUDIO_NODE_TYPES.POLY_SYNTH)).toBe(true)

    const mathDef = nodeRegistry.get(NODE_TYPES.MATH)
    expect(mathDef).toBeDefined()
    expect(mathDef?.createEngine).toBeTypeOf('function')
    expect(mathDef?.component).toBeUndefined()
  })

  it('instantiates and executes headless nodes in pure non-DOM environment', () => {
    registerCoreNodes()
    const mathDef = nodeRegistry.get(NODE_TYPES.MATH)!
    const node = mathDef.createEngine!({ initialData: { a: 10, b: 25, operator: 'ADD' } })

    expect(node).toBeInstanceOf(BaseNode)
    let calculated = 0
    node.subscribe((name, val) => {
      if (name === 'result') calculated = val as number
    })

    node.setInput('a', 15)
    expect(calculated).toBe(40)
  })

  it('runs SelectionManager in headless mode without crashing on missing document/CSS', () => {
    const sel = new SelectionManager()
    expect(sel.selectedIds).toEqual([])
    expect(sel.hasSelection).toBe(false)

    sel.select(['node-1', 'node-2'])
    expect(sel.selectedIds).toEqual(['node-1', 'node-2'])
    expect(sel.count).toBe(2)

    sel.deselect('node-1')
    expect(sel.selectedIds).toEqual(['node-2'])

    // Box bounds math in headless
    sel.selectInBox(
      { left: 0, top: 0, right: 100, bottom: 100 },
      [
        { id: 'node-a', x: 20, y: 30, width: 50, height: 50 },
        { id: 'node-b', x: 200, y: 300, width: 50, height: 50 },
      ],
      { additive: false },
    )
    expect(sel.selectedIds).toEqual(['node-a'])
  })

  it('compiles graph to pure JIT JS function in headless runtime', () => {
    const graph = new BaseGraph()
    const mathDef = nodeRegistry.get(NODE_TYPES.MATH)!
    const nodeA = mathDef.createEngine!({ id: 'add-1', initialData: { a: 5, b: 7, operator: 'ADD' } })
    graph.addNode(nodeA)

    const compiled = compileToFunction(graph)
    expect(compiled).toBeTypeOf('function')
    const result = compiled()
    expect(result).toBeDefined()
  })
})
