import { describe, it, expect } from 'vitest'
import { MagneticDAGEngine, type EngineNode } from '../magneticDAGEngine.system'

describe('MagneticDAGEngine', () => {
  function createMockNode(id: string, x = 0, y = 0): EngineNode {
    return {
      id,
      x,
      y,
      vx: 0,
      vy: 0,
      moveTo(newX: number, newY: number) {
        this.x = newX
        this.y = newY
      },
    }
  }

  it('correctly calculates 3 columns for a 3-node linear DAG with port-based edges', () => {
    const engine = new MagneticDAGEngine()
    const n1 = createMockNode('math-in')
    const n2 = createMockNode('sub-1')
    const n3 = createMockNode('display-1')

    const nodes = [n1, n2, n3]
    const edges: [string, string][] = [
      ['math-in:result', 'sub-1:A'],
      ['sub-1:Result', 'display-1:value'],
    ]

    const result = engine.initLayout(nodes, edges, 1000, 600)
    expect(result.success).toBe(true)

    // Layers should be 0, 1, 2
    expect(engine.layersMap.get('math-in')).toBe(0)
    expect(engine.layersMap.get('sub-1')).toBe(1)
    expect(engine.layersMap.get('display-1')).toBe(2)

    // X coordinates should be strictly ascending in distinct columns
    expect(n1.x).toBeLessThan(n2.x)
    expect(n2.x).toBeLessThan(n3.x)
    expect(n2.x - n1.x).toBe(engine.columnWidth)
    expect(n3.x - n2.x).toBe(engine.columnWidth)
  })

  it('updates topology and layers on dynamic edge change', () => {
    const engine = new MagneticDAGEngine()
    const n1 = createMockNode('n1')
    const n2 = createMockNode('n2')

    engine.initLayout([n1, n2], [], 800, 600)
    expect(engine.layersMap.get('n1')).toBe(0)
    expect(engine.layersMap.get('n2')).toBe(0)

    // Add edge
    engine.onTopologyChange([n1, n2], [['n1:out', 'n2:in']])
    expect(engine.isTopologyDirty).toBe(true)

    // Run physics tick
    engine.tickPhysics(800, 600, [])
    expect(engine.isTopologyDirty).toBe(false)
    expect(engine.layersMap.get('n1')).toBe(0)
    expect(engine.layersMap.get('n2')).toBe(1)
  })

  it('correctly expands to 4 columns and pulls intermediate node to its DAG column', () => {
    const engine = new MagneticDAGEngine()
    const nodeA = createMockNode('node-a')
    const nodeB = createMockNode('node-b')
    const nodeC = createMockNode('node-c')

    // Initial 3 columns: A -> B -> C
    engine.initLayout(
      [nodeA, nodeB, nodeC],
      [
        ['node-a:out', 'node-b:in'],
        ['node-b:out', 'node-c:in'],
      ],
      1200,
      600,
    )

    expect(engine.layersMap.get('node-a')).toBe(0)
    expect(engine.layersMap.get('node-b')).toBe(1)
    expect(engine.layersMap.get('node-c')).toBe(2)

    // User adds new node D in the middle (e.g. placed at x = 600)
    const nodeD = createMockNode('node-d', 600, 300)
    const allNodes = [nodeA, nodeB, nodeC, nodeD]
    const updatedEdges: [string, string][] = [
      ['node-a:out', 'node-d:in'],
      ['node-d:out', 'node-b:in'],
      ['node-b:out', 'node-c:in'],
    ]

    engine.onTopologyChange(allNodes, updatedEdges)

    // Run physics ticks until settled
    for (let i = 0; i < 50; i++) {
      engine.tickPhysics(1200, 600, [])
    }

    // Now 4 columns: A(0) -> D(1) -> B(2) -> C(3)
    expect(engine.layersMap.get('node-a')).toBe(0)
    expect(engine.layersMap.get('node-d')).toBe(1)
    expect(engine.layersMap.get('node-b')).toBe(2)
    expect(engine.layersMap.get('node-c')).toBe(3)

    // Node D must be in Column 1 (to the left of B), B in Column 2, C in Column 3
    expect(nodeA.x).toBeLessThan(nodeD.x)
    expect(nodeD.x).toBeLessThan(nodeB.x)
    expect(nodeB.x).toBeLessThan(nodeC.x)

    // Spacing between columns must be columnWidth
    expect(Math.round(nodeD.x - nodeA.x)).toBe(engine.columnWidth)
    expect(Math.round(nodeB.x - nodeD.x)).toBe(engine.columnWidth)
    expect(Math.round(nodeC.x - nodeB.x)).toBe(engine.columnWidth)
  })

  it('never overwrites or moves a grabbed node during physics ticks', () => {
    const engine = new MagneticDAGEngine()
    const nodeA = createMockNode('node-a', 100, 100)
    const nodeB = createMockNode('node-b', 400, 100)

    engine.initLayout([nodeA, nodeB], [['node-a:out', 'node-b:in']], 1000, 600)

    // User grabs nodeA and moves it to custom coords (999, 888)
    nodeA.moveTo(999, 888)
    engine.updateDraggedNode(nodeA)

    // Run multiple physics ticks while nodeA is active in activeDraggedNodes
    for (let i = 0; i < 20; i++) {
      engine.tickPhysics(1000, 600, ['node-a'])
    }

    // Grabbed node must remain EXACTLY at user's custom coords with 0 velocity
    expect(nodeA.x).toBe(999)
    expect(nodeA.y).toBe(888)
    expect(nodeA.vx).toBe(0)
    expect(nodeA.vy).toBe(0)
  })

  it('dynamically adapts DAG column spacing when columnWidth is customized', () => {
    const engine = new MagneticDAGEngine()
    const nodeA = createMockNode('node-a')
    const nodeB = createMockNode('node-b')

    engine.initLayout([nodeA, nodeB], [['node-a:out', 'node-b:in']], 1200, 600)
    expect(engine.columnWidth).toBe(300)

    // Customize column width to 450px
    engine.columnWidth = 450
    expect(engine.columnWidth).toBe(450)
    expect(engine.isTopologyDirty).toBe(true)

    // Run physics to settle
    for (let i = 0; i < 50; i++) {
      engine.tickPhysics(1200, 600, [])
    }

    expect(Math.round(nodeB.x - nodeA.x)).toBe(450)
  })

  it('vertically spaces multiple nodes in the same layer and stabilizes coordinates on initLayout', () => {
    const engine = new MagneticDAGEngine()
    const n1 = createMockNode('root-1')
    const n2 = createMockNode('root-2')
    const n3 = createMockNode('root-3')

    const result = engine.initLayout([n1, n2, n3], [], 1200, 800)
    expect(result.success).toBe(true)

    // All nodes in layer 0 have same column X
    expect(n1.x).toBe(n2.x)
    expect(n2.x).toBe(n3.x)

    // Nodes must be separated vertically (no overlapping at same Y)
    expect(Math.abs(n2.y - n1.y)).toBeGreaterThanOrEqual(engine.nodeMarginY * 0.9)
    expect(Math.abs(n3.y - n2.y)).toBeGreaterThanOrEqual(engine.nodeMarginY * 0.9)

    // Velocities must be settled (0) immediately
    expect(n1.vx).toBe(0)
    expect(n2.vx).toBe(0)
    expect(n3.vx).toBe(0)
  })

  it('applies crossing reduction during initLayout to untangle crossing edges', () => {
    const engine = new MagneticDAGEngine({ crossingReduction: true })
    const u1 = createMockNode('u1')
    const u2 = createMockNode('u2')
    const v1 = createMockNode('v1')
    const v2 = createMockNode('v2')

    const nodes = [u1, u2, v1, v2]
    const edges: [string, string][] = [
      ['u1:out', 'v2:in'],
      ['u2:out', 'v1:in'],
    ]

    const result = engine.initLayout(nodes, edges, 1000, 600)
    expect(result.success).toBe(true)

    // v2 should be positioned higher than v1 to eliminate edge crossing
    expect(v2.y).toBeLessThan(v1.y)
  })

  it('arranges nodes in a balanced square disposition when squareDisposition is enabled', () => {
    const engine = new MagneticDAGEngine({ squareDisposition: true, targetAspectRatio: 1.0 })
    const nodes = Array.from({ length: 9 }, (_, i) => createMockNode(`item-${i}`))

    const result = engine.initLayout(nodes, [], 1400, 800)
    expect(result.success).toBe(true)

    // Columns should be distributed into 3 distinct X values
    const distinctX = Array.from(new Set(nodes.map((n) => Math.round(n.x)))).sort((a, b) => a - b)
    expect(distinctX.length).toBe(3)

    // Each column should have 3 nodes
    for (const xVal of distinctX) {
      const inCol = nodes.filter((n) => Math.round(n.x) === xVal)
      expect(inCol.length).toBe(3)
    }
  })

  it('takes higher row heights into account when placing nodes in square disposition', () => {
    const engine = new MagneticDAGEngine({
      squareDisposition: true,
      targetAspectRatio: 1.0,
      columnWidth: 300,
      rowHeight: 600,
    })
    const nodes = Array.from({ length: 8 }, (_, i) => createMockNode(`table-${i}`))

    const result = engine.initLayout(nodes, [], 1600, 1600)
    expect(result.success).toBe(true)

    // With dimRatio = 300 / 600 = 0.5, capacity per column is 2
    // 8 nodes form 4 columns of 2 nodes
    const distinctX = Array.from(new Set(nodes.map((n) => Math.round(n.x)))).sort((a, b) => a - b)
    expect(distinctX.length).toBe(4)

    for (const xVal of distinctX) {
      const inCol = nodes.filter((n) => Math.round(n.x) === xVal)
      expect(inCol.length).toBe(2)
    }

    // Vertical pitch should respect the higher rowHeight/nodeMarginY (600px)
    for (const xVal of distinctX) {
      const inCol = nodes.filter((n) => Math.round(n.x) === xVal).sort((a, b) => a.y - b.y)
      const verticalPitch = inCol[1].y - inCol[0].y
      expect(verticalPitch).toBeGreaterThanOrEqual(580)
    }
  })

  it('strictly aligns horizontal rows across columns (matching Y coordinates per row)', () => {
    // Mimic the schema editor setup (2 columns, 3 rows, with relationships and isolated table)
    const engine = new MagneticDAGEngine({
      squareDisposition: true,
      crossingReduction: true,
      columnWidth: 380,
      rowHeight: 420,
    })

    const monster = createMockNode('monster')
    const encounter = createMockNode('encounter')
    const charSheet = createMockNode('charSheet')
    const spellbook = createMockNode('spellbook')
    const items = createMockNode('items')
    const inventory = createMockNode('inventory')

    const nodes = [monster, encounter, charSheet, spellbook, items, inventory]
    const edges: [string, string][] = [
      ['monster:id', 'encounter:monster_id'],
      ['charSheet:id', 'inventory:char_id'],
      ['items:id', 'inventory:item_id'],
    ]

    const result = engine.initLayout(nodes, edges, 1400, 1400)
    expect(result.success).toBe(true)

    // Col 0: monster, charSheet, items
    // Col 1: encounter, spellbook, inventory
    expect(monster.x).toBe(charSheet.x)
    expect(charSheet.x).toBe(items.x)
    expect(encounter.x).toBe(spellbook.x)
    expect(spellbook.x).toBe(inventory.x)

    // Top Row: monster and encounter must share the EXACT SAME Y coordinate
    expect(monster.y).toBe(encounter.y)

    // Middle Row: charSheet and spellbook must share the EXACT SAME Y coordinate
    expect(charSheet.y).toBe(spellbook.y)

    // Bottom Row: items and inventory must share the EXACT SAME Y coordinate
    expect(items.y).toBe(inventory.y)

    // Rows must be separated by rowHeight (420)
    expect(charSheet.y - monster.y).toBe(420)
    expect(items.y - charSheet.y).toBe(420)
  })

  it('accounts for tall node heights during initLayout and resolveVerticalOverlaps', () => {
    const engine = new MagneticDAGEngine()
    const tall1 = { ...createMockNode('synth-1', 380, 60), axonNodeType: 'poly-synth', height: 320 }
    const tall2 = { ...createMockNode('synth-2', 380, 260), axonNodeType: 'poly-synth', height: 320 }

    // resolveVerticalOverlaps should push tall2 down so it does not overlap tall1 (height 320 + gap 48 = 368)
    MagneticDAGEngine.resolveVerticalOverlaps([tall1, tall2], 48)
    expect(tall2.y - tall1.y).toBeGreaterThanOrEqual(320 + 48)

    // initLayout should also separate tall nodes by at least their height + verticalGap
    const seq1 = { ...createMockNode('seq-1'), axonNodeType: 'sequence' }
    const seq2 = { ...createMockNode('seq-2'), axonNodeType: 'sequence' }
    engine.initLayout([seq1, seq2], [], 1200, 800)
    expect(Math.abs(seq2.y - seq1.y)).toBeGreaterThanOrEqual(210 + engine.verticalGap)
  })
})

