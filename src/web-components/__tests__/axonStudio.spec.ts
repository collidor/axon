// oxlint-disable typescript/no-explicit-any
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@collidor/ui'
import '../axonGraph.component'
import '../axonStudio.component'
import { AxonStudio, PRESET_GRAPHS } from '../axonStudio.component'
import { TAG_NAMES } from '../constants'
import { registerCoreNodes } from '../../nodes/nodeLibrary'

describe('AxonStudio Component & Interactive Shell (Ticket 005)', () => {
  let studio: AxonStudio

  beforeEach(() => {
    registerCoreNodes()
    document.body.innerHTML = ''
    studio = document.createElement(TAG_NAMES.AXON_STUDIO) as AxonStudio
    document.body.appendChild(studio)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders studio layout with toolbar, palette, graph, and statusbar (without sidebar inspector)', () => {
    expect(studio).toBeDefined()
    expect(studio.querySelector('.axon-studio-toolbar')).not.toBeNull()
    expect(studio.querySelector('.axon-studio-palette')).not.toBeNull()
    expect(studio.querySelector('#studio-graph')).not.toBeNull()
    expect(studio.querySelector('#studio-inspector')).toBeNull()
    expect(studio.querySelector('#studio-inspector-container')).toBeNull()
    expect(studio.querySelector('.axon-studio-statusbar')).not.toBeNull()
  })

  it('automatically binds AxonGraph and CommandHistoryManager to the studio shell', () => {
    expect(studio.graph).not.toBeNull()
    expect(studio.historyManager).toBeDefined()
  })

  it('loads predefined preset graphs (oscillator, combat, transform, blank)', () => {
    // 1. Oscillator preset was loaded on connect
    expect(studio.graph).not.toBeNull()
    let serialized = studio.graph!.serialize()
    expect(serialized.nodes.length).toBeGreaterThan(0)
    expect(serialized.edges.length).toBeGreaterThan(0)

    // 2. Load combat preset
    studio.loadPreset('combat')
    serialized = studio.graph!.serialize()
    expect(serialized.nodes.some((n) => n.id === 'event-moved' || n.type === 'event')).toBe(true)

    // 3. Load transform preset
    studio.loadPreset('transform')
    serialized = studio.graph!.serialize()
    expect(serialized.nodes.some((n) => n.type === 'gate' || n.type === 'compare')).toBe(true)

    // 4. Load blank preset
    studio.loadPreset('blank')
    serialized = studio.graph!.serialize()
    expect(serialized.nodes.length).toBe(0)
    expect(serialized.edges.length).toBe(0)
  })

  it('spawns a new node through studio.spawnNode and selects it on the canvas', () => {
    studio.loadPreset('blank')
    const nodeId = studio.spawnNode('math', 250, 180, { a: 99, b: 1, operator: 'ADD' })
    expect(nodeId).toBeDefined()

    const nodeEl = studio.graph?.querySelector(`#${CSS.escape(nodeId)}`)
    expect(nodeEl).not.toBeNull()
    expect(studio.graph?.selectionManager.selectedIds).toContain(nodeId)
  })

  it('supports undo and redo through CommandHistoryManager in the studio', () => {
    studio.loadPreset('blank')
    const nodeId = studio.spawnNode('clock', 100, 100, { hz: 10 })
    expect(studio.graph?.querySelector(`#${CSS.escape(nodeId)}`)).not.toBeNull()

    // Undo should remove the node
    expect(studio.historyManager.canUndo).toBe(true)
    studio.undo()
    expect(studio.graph?.querySelector(`#${CSS.escape(nodeId)}`)).toBeNull()

    // Redo should restore the node
    expect(studio.historyManager.canRedo).toBe(true)
    studio.redo()
    expect(studio.graph?.querySelector(`#${CSS.escape(nodeId)}`)).not.toBeNull()
  })

  it('exports and imports serialized JSON graphs cleanly', () => {
    studio.loadPreset('oscillator')
    const json = studio.exportJSON()
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json)
    expect(parsed.nodes.length).toBe(4)
    expect(parsed.edges.length).toBe(3)

    // Clear and re-import
    studio.clear()
    expect(studio.graph?.serialize().nodes.length).toBe(0)

    studio.importJSON(json)
    expect(studio.graph?.serialize().nodes.length).toBe(4)
    expect(studio.graph?.serialize().edges.length).toBe(3)
  })

  it('toggles simulation run/pause state and mode controls', () => {
    expect(studio.isRunning).toBe(true)
    studio.toggleRun()
    expect(studio.isRunning).toBe(false)
    studio.toggleRun()
    expect(studio.isRunning).toBe(true)

    // Drag mode toggle
    const modeBtn = studio.querySelector<HTMLButtonElement>('#studio-btn-mode')!
    expect(studio.graph?.dragMode).toBe('pan')
    modeBtn.click()
    expect(studio.graph?.dragMode).toBe('box-select')
    modeBtn.click()
    expect(studio.graph?.dragMode).toBe('pan')
  })

  it('compiles active studio graph to TypeScript and emits axon-graph-compiled event', () => {
    studio.loadPreset('transform')
    let compiledCode = ''
    studio.addEventListener('axon-graph-compiled', (e: Event) => {
      compiledCode = (e as CustomEvent).detail.code
    })

    const compileBtn = studio.querySelector<HTMLButtonElement>('#studio-btn-compile')!
    expect(compileBtn).not.toBeNull()
    compileBtn.click()

    expect(compiledCode).toContain('export function executeCompiledGraph')
    expect(compiledCode).toContain('return {')
  })

  it('closes quick add context menu when clicking outside it', async () => {
    const quickAdd = studio.querySelector<HTMLElement>('#studio-quick-add')!
    expect(quickAdd).not.toBeNull()
    expect(quickAdd.style.display).toBe('none')

    // 1. Right click on graph canvas to open quick add
    studio.graph?.dispatchEvent(new MouseEvent('contextmenu', { clientX: 300, clientY: 200, bubbles: true }))
    expect(quickAdd.style.display).toBe('block')

    await new Promise((r) => setTimeout(r, 10))

    // 2. Click inside quick add modal does NOT close it
    const input = quickAdd.querySelector<HTMLInputElement>('#studio-quick-add-search')!
    input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(quickAdd.style.display).toBe('block')

    // 3. Click outside quick add modal (e.g. on canvas/body) closes it
    studio.graph?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(quickAdd.style.display).toBe('none')
  })

  it('supports dragging and dropping nodes from the sidebar palette onto the canvas', () => {
    studio.loadPreset('blank')
    const paletteItem = studio.querySelector<HTMLElement>('.palette-item[data-node-type="math"]')
    expect(paletteItem).not.toBeNull()
    expect(paletteItem?.getAttribute('draggable')).toBe('true')

    const dataStore: Record<string, string> = {}
    const mockDataTransfer = {
      setData: (format: string, data: string) => {
        dataStore[format] = data
      },
      getData: (format: string) => dataStore[format] || '',
      types: ['application/json', 'text/plain'],
      effectAllowed: 'all',
      dropEffect: 'none',
    }

    // 1. Dispatch dragstart on sidebar palette item
    const dragStartEvent = new Event('dragstart', { bubbles: true, cancelable: true }) as any
    dragStartEvent.dataTransfer = mockDataTransfer
    paletteItem?.dispatchEvent(dragStartEvent)

    expect(paletteItem?.classList.contains('is-dragging')).toBe(true)
    expect(dataStore['application/json']).toBeDefined()
    const payload = JSON.parse(dataStore['application/json'])
    expect(payload.type).toBe('math')

    // 2. Dispatch dragover on canvas container
    const canvasContainer = studio.querySelector<HTMLElement>('#studio-canvas-container')!
    expect(canvasContainer).not.toBeNull()

    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true }) as any
    dragOverEvent.dataTransfer = mockDataTransfer
    canvasContainer.dispatchEvent(dragOverEvent)
    expect(canvasContainer.classList.contains('is-drag-over')).toBe(true)

    // 3. Dispatch drop on canvas container at clientX: 400, clientY: 300
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as any
    dropEvent.dataTransfer = mockDataTransfer
    dropEvent.clientX = 400
    dropEvent.clientY = 300
    canvasContainer.dispatchEvent(dropEvent)

    expect(canvasContainer.classList.contains('is-drag-over')).toBe(false)

    // 4. Verify node was created in graph
    const nodes = studio.graph?.querySelectorAll('[data-axon-node]') || []
    expect(nodes.length).toBe(1)
    const createdNode = nodes[0] as HTMLElement
    expect(createdNode.getAttribute('data-node-type')).toBe('math')

    // 5. Verify undo removes the dragged node
    expect(studio.historyManager.canUndo).toBe(true)
    studio.undo()
    expect(studio.graph?.querySelectorAll('[data-axon-node]').length).toBe(0)
  })

  it('supports native drag and drop directly onto AxonGraph element', () => {
    studio.loadPreset('blank')
    const graphEl = studio.graph!
    expect(graphEl).not.toBeNull()

    const dataStore: Record<string, string> = {
      'text/plain': 'compare',
    }
    const mockDataTransfer = {
      setData: (format: string, data: string) => {
        dataStore[format] = data
      },
      getData: (format: string) => dataStore[format] || '',
      types: ['text/plain'],
      effectAllowed: 'copy',
      dropEffect: 'none',
    }

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as any
    dropEvent.dataTransfer = mockDataTransfer
    dropEvent.clientX = 250
    dropEvent.clientY = 180
    graphEl.dispatchEvent(dropEvent)

    const nodes = graphEl.querySelectorAll('[data-axon-node]')
    expect(nodes.length).toBe(1)
    expect((nodes[0] as HTMLElement).getAttribute('data-node-type')).toBe('compare')
  })
})

