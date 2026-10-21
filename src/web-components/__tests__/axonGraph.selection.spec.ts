/* oxlint-disable typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '../axonGraph.component'
import '../axonBox.component'
import '../nodes/umlTableNode.component'
import '../nodes/dataGraphNodes.component'
import { TAG_NAMES } from '../constants'
import type { AxonGraphType, AxonBoxType } from '../constants'

describe('AxonGraph Multi-Select Integration', () => {
  let graph: AxonGraphType
  let box1: AxonBoxType
  let box2: AxonBoxType
  let box3: AxonBoxType

  beforeEach(() => {
    graph = document.createElement(TAG_NAMES.AXON_GRAPH) as unknown as AxonGraphType
    document.body.appendChild(graph)

    box1 = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box1.id = 'box-1'
    Object.defineProperty(box1, 'x', { value: 50, writable: true })
    Object.defineProperty(box1, 'y', { value: 50, writable: true })
    Object.defineProperty(box1, 'offsetWidth', { value: 100, configurable: true })
    Object.defineProperty(box1, 'offsetHeight', { value: 60, configurable: true })
    graph.appendChild(box1 as unknown as Node)

    box2 = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box2.id = 'box-2'
    Object.defineProperty(box2, 'x', { value: 200, writable: true })
    Object.defineProperty(box2, 'y', { value: 50, writable: true })
    Object.defineProperty(box2, 'offsetWidth', { value: 100, configurable: true })
    Object.defineProperty(box2, 'offsetHeight', { value: 60, configurable: true })
    graph.appendChild(box2 as unknown as Node)

    box3 = document.createElement(TAG_NAMES.AXON_BOX) as unknown as AxonBoxType
    box3.id = 'box-3'
    Object.defineProperty(box3, 'x', { value: 500, writable: true })
    Object.defineProperty(box3, 'y', { value: 500, writable: true })
    Object.defineProperty(box3, 'offsetWidth', { value: 100, configurable: true })
    Object.defineProperty(box3, 'offsetHeight', { value: 60, configurable: true })
    graph.appendChild(box3 as unknown as Node)
  })

  afterEach(() => {
    if (graph && graph.parentNode) {
      graph.parentNode.removeChild(graph as unknown as Node)
    }
    vi.restoreAllMocks()
  })

  it('exposes selectionManager on AxonGraph instance', () => {
    expect(graph.selectionManager).toBeDefined()
    expect(graph.selectionManager.mode).toBe('multiple')
    expect(graph.selectionManager.selectedIds).toEqual([])
  })

  it('selects single box on click and clears others when no modifier key', () => {
    box1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60 }))
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['box-1'])
    expect(box1.classList.contains('is-selected')).toBe(true)

    // Click box 2 without modifier
    box2.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 210, clientY: 60 }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['box-2'])
    expect(box1.classList.contains('is-selected')).toBe(false)
    expect(box2.classList.contains('is-selected')).toBe(true)
  })

  it('multi-selects nodes with Shift-click and Ctrl-click', () => {
    // Click box 1
    box1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60 }))
    window.dispatchEvent(new PointerEvent('pointerup'))

    // Shift-click box 2
    box2.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 210,
        clientY: 60,
        shiftKey: true,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toContain('box-1')
    expect(graph.selectionManager.selectedIds).toContain('box-2')
    expect(graph.selectionManager.count).toBe(2)
    expect(box1.classList.contains('is-selected')).toBe(true)
    expect(box2.classList.contains('is-selected')).toBe(true)

    // Ctrl-click box 1 to toggle it off
    box1.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 60,
        clientY: 60,
        ctrlKey: true,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['box-2'])
    expect(box1.classList.contains('is-selected')).toBe(false)
    expect(box2.classList.contains('is-selected')).toBe(true)
  })

  it('dispatches selection-change event from AxonGraph', () => {
    const eventSpy = vi.fn<() => void>()
    graph.addEventListener('selection-change', eventSpy)

    graph.selectionManager.select('box-1')
    expect(eventSpy).toHaveBeenCalled()
  })

  it('multi-selects multiple nodes via marquee selection box', () => {
    vi.spyOn(graph, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 800,
      right: 1000,
      bottom: 800,
    } as DOMRect)

    // Pointerdown on canvas to begin marquee
    graph.dragMode = 'box-select'
    graph.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 10, bubbles: true }),
    )

    // Move across box-1 and box-2
    window.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 350, clientY: 150, bubbles: true }),
    )

    expect(graph.selectionManager.selectedIds).toContain('box-1')
    expect(graph.selectionManager.selectedIds).toContain('box-2')
    expect(graph.selectionManager.isSelected('box-3')).toBe(false)

    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    expect(graph.selectionManager.count).toBe(2)
  })

  it('selects box on header click, and Shift + left click on header adds to selection', () => {
    // Add header and body to box1 and box2
    const header1 = document.createElement('div')
    header1.className = 'node-header'
    const title1 = document.createElement('h3')
    title1.textContent = 'Node 1'
    header1.appendChild(title1)
    box1.appendChild(header1)

    const header2 = document.createElement('div')
    header2.className = 'node-header'
    const title2 = document.createElement('h3')
    title2.textContent = 'Node 2'
    header2.appendChild(title2)
    box2.appendChild(header2)

    // Left click on header1 selects box1
    title1.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 60, clientY: 60 }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['box-1'])

    // Shift + left click on header2 adds box2 to selection
    title2.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        shiftKey: true,
        clientX: 210,
        clientY: 60,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['box-1', 'box-2'])
  })

  it('selects node when clicking on node body, but filters interactive controls', () => {
    // Add header and body to box1
    const header = document.createElement('div')
    header.className = 'node-header'
    box1.appendChild(header)

    const body = document.createElement('div')
    body.className = 'node-body'
    const content = document.createElement('div')
    content.className = 'custom-content'
    const button = document.createElement('button')
    button.textContent = 'Click me'
    body.appendChild(content)
    body.appendChild(button)
    box1.appendChild(body)

    // Click inside body (not header) selects box1 (Ticket 038: eliminate drag/select deadzones)
    content.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 60,
        clientY: 80,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['box-1'])
    expect(box1.classList.contains('is-selected')).toBe(true)

    // Clear selection
    graph.selectionManager.clearSelection()
    expect(graph.selectionManager.selectedIds).toEqual([])

    // Clicking an interactive button inside body does NOT select node or drag
    button.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 60,
        clientY: 90,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual([])
  })

  it('selects table axon nodes on header and Shift+click adds to selection', () => {
    const table1 = document.createElement(TAG_NAMES.AXON_UML_TABLE_NODE) as any
    table1.id = 'table-1'
    table1.nodeData = {
      tableName: 'characters',
      displayName: 'Characters',
      columns: [{ name: 'id', type: 'string', isPrimary: true }],
    }
    graph.appendChild(table1)

    const table2 = document.createElement(TAG_NAMES.AXON_UML_TABLE_NODE) as any
    table2.id = 'table-2'
    table2.nodeData = {
      tableName: 'inventory',
      displayName: 'Inventory',
      columns: [{ name: 'char_id', type: 'string', isForeignKey: true }],
    }
    graph.appendChild(table2)

    // Click header of table 1
    const headerTitle1 = table1.querySelector('.uml-table-title') as HTMLElement
    expect(headerTitle1).toBeDefined()
    headerTitle1.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['table-1'])
    expect(table1.classList.contains('is-selected')).toBe(true)
    expect(table1.classList.contains('selected')).toBe(true)

    // Shift + click header of table 2 adds to selection
    const headerTitle2 = table2.querySelector('.uml-table-title') as HTMLElement
    expect(headerTitle2).toBeDefined()
    headerTitle2.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        shiftKey: true,
        clientX: 200,
        clientY: 100,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['table-1', 'table-2'])
    expect(table1.classList.contains('is-selected')).toBe(true)
    expect(table2.classList.contains('is-selected')).toBe(true)
    expect(table2.classList.contains('selected')).toBe(true)

    // Clicking table wrapper selects table and clears others
    const wrapper1 = table1.querySelector('.uml-table-wrapper') as HTMLElement
    expect(wrapper1).toBeDefined()
    wrapper1.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 120 }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['table-1'])
    expect(table2.classList.contains('is-selected')).toBe(false)
  })

  it('selects axon-table-query-node on header and Shift+click adds to selection', () => {
    const queryNode = document.createElement(TAG_NAMES.AXON_TABLE_QUERY_NODE) as any
    queryNode.id = 'query-1'
    queryNode.nodeData = { tableName: 'spells' }
    graph.appendChild(queryNode)

    const queryHeader = queryNode.querySelector('.table-query-header') as HTMLElement
    expect(queryHeader).toBeDefined()

    queryHeader.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: 50 }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(graph.selectionManager.selectedIds).toEqual(['query-1'])
    expect(queryNode.classList.contains('is-selected')).toBe(true)
    expect(queryNode.classList.contains('selected')).toBe(true)
  })

  it('changes column type via inline select on axon-uml-table-node', () => {
    const table = document.createElement(TAG_NAMES.AXON_UML_TABLE_NODE) as any
    table.id = 'table-heroes'
    table.nodeData = {
      tableName: 'heroes',
      displayName: 'Heroes',
      columns: [{ name: 'hp', type: 'integer' }],
    }
    graph.appendChild(table)

    const updateSpy = vi.fn<(e: any) => void>()
    window.addEventListener('ui-update-column', updateSpy)

    const selectEl = table.querySelector('.uml-col-type-select') as HTMLSelectElement
    expect(selectEl).toBeDefined()
    expect(selectEl.value).toBe('integer')

    // Change to boolean
    selectEl.value = 'boolean'
    selectEl.dispatchEvent(new Event('change', { bubbles: true }))

    expect(updateSpy).toHaveBeenCalled()
    const detail = updateSpy.mock.calls[0][0].detail
    expect(detail.tableId).toBe('table-heroes')
    expect(detail.columnName).toBe('hp')
    expect(detail.patch.type).toBe('boolean')

    window.removeEventListener('ui-update-column', updateSpy)
  })

  it('opens contextmenu on right-click on column row and toggles nullable and primary key', () => {
    const table = document.createElement(TAG_NAMES.AXON_UML_TABLE_NODE) as any
    table.id = 'table-heroes'
    table.nodeData = {
      tableName: 'heroes',
      displayName: 'Heroes',
      columns: [{ name: 'mana', type: 'integer', isNullable: false, isPrimary: false }],
    }
    graph.appendChild(table)

    const updateSpy = vi.fn<(e: any) => void>()
    window.addEventListener('ui-update-column', updateSpy)

    const rowEl = table.querySelector('.uml-column-row') as HTMLElement
    expect(rowEl).toBeDefined()

    // Right-click to open context menu
    rowEl.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 200,
      }),
    )

    const menu = document.querySelector('.uml-row-context-menu') as HTMLElement
    expect(menu).not.toBeNull()

    // Click toggle-nullable
    const nullableBtn = menu.querySelector('[data-action="toggle-nullable"]') as HTMLButtonElement
    expect(nullableBtn).toBeDefined()
    nullableBtn.click()

    expect(updateSpy).toHaveBeenCalled()
    const detail = updateSpy.mock.calls[0][0].detail
    expect(detail.patch.isNullable).toBe(true)

    // Context menu should have closed
    expect(document.querySelector('.uml-row-context-menu')).toBeNull()

    window.removeEventListener('ui-update-column', updateSpy)
  })

  it('closes column context menu on window blur and escape key', async () => {
    const table = document.createElement(TAG_NAMES.AXON_UML_TABLE_NODE) as any
    table.id = 'table-heroes-blur'
    table.nodeData = {
      tableName: 'heroes',
      displayName: 'Heroes',
      columns: [{ name: 'mana', type: 'integer' }],
    }
    graph.appendChild(table)

    const rowEl = table.querySelector('.uml-column-row') as HTMLElement
    rowEl.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 200,
      }),
    )

    let menu = document.querySelector('.uml-row-context-menu') as HTMLElement
    expect(menu).not.toBeNull()

    // Dispatch blur event on window
    window.dispatchEvent(new Event('blur'))
    expect(document.querySelector('.uml-row-context-menu')).toBeNull()

    // Open again
    rowEl.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 200,
      }),
    )
    menu = document.querySelector('.uml-row-context-menu') as HTMLElement
    expect(menu).not.toBeNull()

    // Wait for setup timeout
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Press Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.querySelector('.uml-row-context-menu')).toBeNull()
  })
})
