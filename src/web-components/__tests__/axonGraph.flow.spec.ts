/* oxlint-disable typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CommandHistoryManager } from '@collidor/command'
import '../axonGraph.component'
import '../axonPort.component'
import '../axonBox.component'
import '../axonEdge.component'
import { TAG_NAMES } from '../constants'
import type { AxonGraphType, AxonPortBaseType, AxonBoxType } from '../constants'

describe('AxonGraph Component - Comprehensive Flow', () => {
  let graph: AxonGraphType

  beforeEach(() => {
    graph = document.createElement(TAG_NAMES.AXON_GRAPH) as unknown as AxonGraphType
    document.body.appendChild(graph)
  })

  afterEach(() => {
    if (graph && graph.parentNode) {
      graph.parentNode.removeChild(graph as unknown as Node)
    }
    vi.restoreAllMocks()
  })

  it('should initialize and render the shadow DOM', () => {
    expect(graph.shadowRoot).not.toBeNull()
    expect(graph.shadowRoot?.getElementById('svg')).not.toBeNull()
    expect(graph.shadowRoot?.getElementById('vp')).not.toBeNull()
  })

  it('should initiate drawing loop when a connection starts', async () => {
    const drawSpy = vi.spyOn(graph as any, 'draw')
    const box = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box.id = 'box1'
    graph.appendChild(box as unknown as Node)

    const port = document.createElement('axon-port-out') as unknown as AxonPortBaseType
    port.id = 'port1'
    box.appendChild(port as unknown as Node)

    // Start connection
    graph.handleConnectionStart(port)

    // Should have called requestAnimationFrame
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(drawSpy).toHaveBeenCalled()

    // Clear mock to check for auto-loop
    drawSpy.mockClear()
    await new Promise((resolve) => requestAnimationFrame(resolve))

    // It should keep drawing while connecting
    expect(drawSpy).toHaveBeenCalled()

    // Clean up connection gesture
    window.dispatchEvent(new PointerEvent('pointerup'))
  })

  it('should update pan position on wheel event', () => {
    const initialX = graph.viewportTransform.x
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    })

    graph.dispatchEvent(wheelEvent)

    expect(graph.viewportTransform.k).not.toBe(1)
    expect(graph.viewportTransform.x).not.toBe(initialX)
  })

  it('should pan on middle click pointer drag', () => {
    const initialX = graph.viewportTransform.x
    const initialY = graph.viewportTransform.y

    const pointerDown = new PointerEvent('pointerdown', {
      button: 1,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    })
    graph.dispatchEvent(pointerDown)

    const pointerMove1 = new PointerEvent('pointermove', {
      clientX: 150,
      clientY: 175,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(pointerMove1)

    const pointerMove2 = new PointerEvent('pointermove', {
      clientX: 160,
      clientY: 185,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(pointerMove2)

    const pointerUp = new PointerEvent('pointerup', {
      button: 1,
      clientX: 160,
      clientY: 185,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(pointerUp)

    expect(graph.viewportTransform.x).toBe(initialX + 60)
    expect(graph.viewportTransform.y).toBe(initialY + 85)
  })

  it('should correctly calculate port centers', () => {
    const box = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box.id = 'box2'
    Object.defineProperty(box, 'x', { value: 100, writable: true })
    Object.defineProperty(box, 'y', { value: 200, writable: true })

    graph.appendChild(box as unknown as Node)

    const port = document.createElement('axon-port-in') as unknown as AxonPortBaseType
    port.id = 'port2'
    box.appendChild(port as unknown as Node)

    vi.spyOn(box, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 200,
      width: 200,
      height: 100,
      right: 300,
      bottom: 300,
    } as DOMRect)

    vi.spyOn(port, 'getBoundingClientRect').mockReturnValue({
      left: 110,
      top: 210,
      width: 20,
      height: 20,
      right: 130,
      bottom: 230,
    } as DOMRect)

    const center = { x: 0, y: 0 }
    graph.getPortCenter(port, center)

    expect(center.x).toBe(110)
    expect(center.y).toBe(220)
  })

  it('should correctly calculate port centers under zoom level k = 2', () => {
    graph.viewportTransform.k = 2.0
    const box = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box.id = 'box-zoom'
    Object.defineProperty(box, 'x', { value: 100, writable: true })
    Object.defineProperty(box, 'y', { value: 200, writable: true })

    graph.appendChild(box as unknown as Node)

    const port = document.createElement('axon-port-in') as unknown as AxonPortBaseType
    port.id = 'port-zoom'
    box.appendChild(port as unknown as Node)

    // Under k=2, screen bounding rects are doubled in size and offset
    vi.spyOn(box, 'getBoundingClientRect').mockReturnValue({
      left: 200,
      top: 400,
      width: 400,
      height: 200,
      right: 600,
      bottom: 600,
    } as DOMRect)

    vi.spyOn(port, 'getBoundingClientRect').mockReturnValue({
      left: 220,
      top: 420,
      width: 40,
      height: 40,
      right: 260,
      bottom: 460,
    } as DOMRect)

    const center = { x: 0, y: 0 }
    graph.getPortCenter(port, center)

    // (220 - 200) / 2 = 10, (420 - 400) / 2 = 10, 40 / (2 * 2) = 10
    // out.x = 100 + 10 = 110, out.y = 200 + 10 + 10 = 220
    expect(center.x).toBe(110)
    expect(center.y).toBe(220)
  })

  it('should update view and clear port offsets on window resize', async () => {
    const drawSpy = vi.spyOn(graph as any, 'draw')
    window.dispatchEvent(new Event('resize'))
    await new Promise((r) => requestAnimationFrame(r))
    expect(drawSpy).toHaveBeenCalled()
  })

  it('should toggle autoSort property and attribute', () => {
    expect(graph.autoSort).toBe(true)

    graph.autoSort = false
    expect(graph.autoSort).toBe(false)

    graph.setAttribute('autosort', 'true')
    expect(graph.autoSort).toBe(true)

    graph.setAttribute('autosort', 'false')
    expect(graph.autoSort).toBe(false)
  })

  it('should update columnWidth property and attribute', () => {
    const mockEngine = {
      name: 'mock',
      columnWidth: 300,
      nodes: [],
      edges: [],
      initLayout: vi.fn<() => void>(),
      updateDraggedNode: vi.fn<() => void>(),
      onTopologyChange: vi.fn<() => void>(),
      tickPhysics: vi.fn<() => boolean>(),
    }

    graph.layoutEngine = mockEngine as any
    expect(graph.columnWidth).toBe(300)

    graph.columnWidth = 420
    expect(mockEngine.columnWidth).toBe(420)
    expect(graph.columnWidth).toBe(420)

    graph.setAttribute('column-width', '500')
    expect(mockEngine.columnWidth).toBe(500)
    expect(graph.columnWidth).toBe(500)
  })

  it('should not trigger layout topology change when autoSort is disabled', () => {
    const mockEngine = {
      name: 'mock',
      nodes: [],
      edges: [],
      initLayout: vi.fn<() => void>(),
      updateDraggedNode: vi.fn<() => void>(),
      onTopologyChange: vi.fn<() => void>(),
      tickPhysics: vi.fn<() => boolean>(),
    }

    graph.layoutEngine = mockEngine as any
    graph.autoSort = false
    mockEngine.onTopologyChange.mockClear()

    graph.syncEngineLayout(false)
    expect(mockEngine.onTopologyChange).not.toHaveBeenCalled()

    graph.autoSort = true
    graph.syncEngineLayout(false)
    expect(mockEngine.onTopologyChange).toHaveBeenCalled()
  })

  it('triggers auto-sort layout settling on node drag release when autoSort is enabled', () => {
    const mockEngine = {
      name: 'mock',
      nodes: [],
      edges: [],
      initLayout: vi.fn<() => void>(),
      updateDraggedNode: vi.fn<() => void>(),
      onTopologyChange: vi.fn<() => void>(),
      tickPhysics: vi.fn<() => boolean>(),
    }

    graph.layoutEngine = mockEngine as any
    graph.autoSort = true

    const box = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box.id = 'drag-box'
    graph.appendChild(box as unknown as Node)

    mockEngine.onTopologyChange.mockClear()

    // Trigger pointerdown on box
    box.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }),
    )

    // Trigger pointerup on window
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(mockEngine.onTopologyChange).toHaveBeenCalled()
  })

  it('should auto-zoom to center nodes leaving 1 column of space before and after', () => {
    const box1 = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box1.id = 'b1'
    Object.defineProperty(box1, 'x', { value: 300, writable: true })
    Object.defineProperty(box1, 'y', { value: 100, writable: true })
    Object.defineProperty(box1, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(box1, 'offsetHeight', { value: 100, configurable: true })

    const box2 = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box2.id = 'b2'
    Object.defineProperty(box2, 'x', { value: 900, writable: true })
    Object.defineProperty(box2, 'y', { value: 100, writable: true })
    Object.defineProperty(box2, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(box2, 'offsetHeight', { value: 100, configurable: true })

    graph.appendChild(box1 as unknown as Node)
    graph.appendChild(box2 as unknown as Node)

    vi.spyOn(graph, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1200,
      height: 600,
      right: 1200,
      bottom: 600,
    } as DOMRect)

    graph.autoZoom(1)

    // With 1 column (300px) before (300 - 300 = 0) and after (1100 + 300 = 1400):
    // Total width = 1400. scaleX = 1200 / 1400 = 0.857...
    expect(graph.viewportTransform.k).toBeCloseTo(1200 / 1400, 2)
    // Centered horizontally: target center = 700. tx = 600 - 700 * k = 0
    expect(graph.viewportTransform.x).toBeCloseTo(0, 1)
  })

  it('should clean up animation loop on disconnection', async () => {
    const drawSpy = vi.spyOn(graph as any, 'draw')
    graph.requestDraw()

    await new Promise((resolve) => requestAnimationFrame(resolve))
    const calls = drawSpy.mock.calls.length

    if (graph.parentNode) {
      graph.parentNode.removeChild(graph as unknown as Node)
    }

    expect(drawSpy.mock.calls.length).toBe(calls)
  })

  it('automatically triggers pending autoZoom when layout settles', () => {
    const mockEngine = {
      name: 'mock',
      nodes: [],
      edges: [],
      columnWidth: 300,
      initLayout: vi.fn<() => void>(),
      updateDraggedNode: vi.fn<() => void>(),
      tickPhysics: vi.fn<() => boolean>().mockReturnValue(false),
      onTopologyChange: vi.fn<() => void>(),
    }
    graph.layoutEngine = mockEngine as any
    graph.autoSort = true

    const box1 = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box1.id = 'b1'
    Object.defineProperty(box1, 'x', { value: 100, writable: true })
    Object.defineProperty(box1, 'y', { value: 100, writable: true })
    Object.defineProperty(box1, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(box1, 'offsetHeight', { value: 100, configurable: true })
    graph.appendChild(box1 as unknown as Node)

    const autoZoomSpy = vi.spyOn(graph, 'autoZoom')
    graph.autoZoom(1)
    graph.syncEngineLayout(true)

    expect(mockEngine.initLayout).toHaveBeenCalled()
    expect(autoZoomSpy).toHaveBeenCalled()
  })

  it('restores displaced edge when undoing an edge replacement on a single-input port (Ticket 039)', () => {
    const historyManager = new CommandHistoryManager()
    graph.historyManager = historyManager

    // Node A with out port
    const boxA = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    boxA.id = 'nA'
    const portAOut = document.createElement(TAG_NAMES.AXON_PORT_OUT) as AxonPortBaseType
    portAOut.id = 'nA:out'
    boxA.appendChild(portAOut as unknown as Node)
    graph.appendChild(boxA as unknown as Node)

    // Node B with out port
    const boxB = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    boxB.id = 'nB'
    const portBOut = document.createElement(TAG_NAMES.AXON_PORT_OUT) as AxonPortBaseType
    portBOut.id = 'nB:out'
    boxB.appendChild(portBOut as unknown as Node)
    graph.appendChild(boxB as unknown as Node)

    // Node C with in port
    const boxC = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    boxC.id = 'nC'
    const portCIn = document.createElement(TAG_NAMES.AXON_PORT_IN) as AxonPortBaseType
    portCIn.id = 'nC:in'
    boxC.appendChild(portCIn as unknown as Node)
    graph.appendChild(boxC as unknown as Node)

    // 1. Connect Node A -> Node C
    graph.handleConnectionStart(portAOut)
    ;(graph as any).findPortAtPoint = vi.fn().mockReturnValue(portCIn)
    window.dispatchEvent(new PointerEvent('pointerup'))

    let edges = Array.from(graph.querySelectorAll(TAG_NAMES.AXON_EDGE)).map((e) => ({
      from: e.getAttribute('from'),
      to: e.getAttribute('to'),
    }))
    expect(edges).toEqual([{ from: 'nA:out', to: 'nC:in' }])
    expect(graph.engine.getIncomingEdges('nC')).toEqual([{ from: 'nA:out', to: 'nC:in' }])

    // 2. Connect Node B -> Node C (replaces Node A connection)
    graph.handleConnectionStart(portBOut)
    ;(graph as any).findPortAtPoint = vi.fn().mockReturnValue(portCIn)
    window.dispatchEvent(new PointerEvent('pointerup'))

    edges = Array.from(graph.querySelectorAll(TAG_NAMES.AXON_EDGE)).map((e) => ({
      from: e.getAttribute('from'),
      to: e.getAttribute('to'),
    }))
    expect(edges).toEqual([{ from: 'nB:out', to: 'nC:in' }])
    expect(graph.engine.getIncomingEdges('nC')).toEqual([{ from: 'nB:out', to: 'nC:in' }])

    // 3. Undo must restore Node A -> Node C
    expect(historyManager.canUndo).toBe(true)
    historyManager.undo()

    edges = Array.from(graph.querySelectorAll(TAG_NAMES.AXON_EDGE)).map((e) => ({
      from: e.getAttribute('from'),
      to: e.getAttribute('to'),
    }))
    expect(edges).toEqual([{ from: 'nA:out', to: 'nC:in' }])
    expect(graph.engine.getIncomingEdges('nC')).toEqual([{ from: 'nA:out', to: 'nC:in' }])

    // 4. Redo must restore Node B -> Node C
    expect(historyManager.canRedo).toBe(true)
    historyManager.redo()

    edges = Array.from(graph.querySelectorAll(TAG_NAMES.AXON_EDGE)).map((e) => ({
      from: e.getAttribute('from'),
      to: e.getAttribute('to'),
    }))
    expect(edges).toEqual([{ from: 'nB:out', to: 'nC:in' }])
    expect(graph.engine.getIncomingEdges('nC')).toEqual([{ from: 'nB:out', to: 'nC:in' }])
  })
})
