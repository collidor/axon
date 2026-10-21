import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SelectionManager,
  MultiSelectManager,
  SelectionSystem,
  type SelectionChangeDetail,
} from '../selectionManager'

describe('SelectionManager & Multi-Select', () => {
  let container: HTMLDivElement
  let nodeA: HTMLDivElement
  let nodeB: HTMLDivElement
  let nodeC: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    nodeA = document.createElement('div')
    nodeA.id = 'node-a'
    container.appendChild(nodeA)

    nodeB = document.createElement('div')
    nodeB.id = 'node-b'
    container.appendChild(nodeB)

    nodeC = document.createElement('div')
    nodeC.id = 'node-c'
    container.appendChild(nodeC)
  })

  it('defaults to multiple selection mode', () => {
    const manager = new SelectionManager()
    expect(manager.mode).toBe('multiple')
    expect(manager.count).toBe(0)
    expect(manager.hasSelection).toBe(false)
    expect(manager.selectedIds).toEqual([])
  })

  it('selects multiple nodes and toggles their selection state', () => {
    const manager = new SelectionManager({ root: container })

    manager.select('node-a')
    expect(manager.isSelected('node-a')).toBe(true)
    expect(manager.isSelected('node-b')).toBe(false)
    expect(manager.selectedIds).toEqual(['node-a'])
    expect(nodeA.classList.contains('is-selected')).toBe(true)

    manager.select(['node-b', 'node-c'])
    expect(manager.selectedIds).toEqual(['node-a', 'node-b', 'node-c'])
    expect(manager.count).toBe(3)
    expect(nodeB.classList.contains('is-selected')).toBe(true)
    expect(nodeC.classList.contains('is-selected')).toBe(true)

    // Toggle off node-b
    manager.toggle('node-b')
    expect(manager.isSelected('node-b')).toBe(false)
    expect(manager.selectedIds).toEqual(['node-a', 'node-c'])
    expect(nodeB.classList.contains('is-selected')).toBe(false)

    // Toggle on node-b
    manager.toggle('node-b')
    expect(manager.isSelected('node-b')).toBe(true)
    expect(nodeB.classList.contains('is-selected')).toBe(true)
  })

  it('clears selection', () => {
    const manager = new SelectionManager({ root: container })
    manager.select(['node-a', 'node-b'])
    expect(manager.count).toBe(2)

    manager.clearSelection()
    expect(manager.count).toBe(0)
    expect(manager.selectedIds).toEqual([])
    expect(nodeA.classList.contains('is-selected')).toBe(false)
    expect(nodeB.classList.contains('is-selected')).toBe(false)
  })

  it('supports single selection mode', () => {
    const manager = new SelectionManager({ mode: 'single', root: container })
    expect(manager.mode).toBe('single')

    manager.select('node-a')
    expect(manager.selectedIds).toEqual(['node-a'])

    manager.select('node-b')
    expect(manager.selectedIds).toEqual(['node-b'])
    expect(nodeA.classList.contains('is-selected')).toBe(false)
    expect(nodeB.classList.contains('is-selected')).toBe(true)

    // Switching from multiple to single trims extra selections
    const multi = new SelectionManager({ root: container })
    multi.select(['node-a', 'node-b', 'node-c'])
    expect(multi.count).toBe(3)

    multi.setMode('single')
    expect(multi.count).toBe(1)
    expect(multi.selectedIds).toEqual(['node-a'])
  })

  it('selectAll selects all provided or queryable elements', () => {
    const manager = new SelectionManager({ root: container })
    manager.selectAll()
    expect(manager.selectedIds).toContain('node-a')
    expect(manager.selectedIds).toContain('node-b')
    expect(manager.selectedIds).toContain('node-c')
    expect(manager.count).toBe(3)

    manager.clear()
    expect(manager.count).toBe(0)

    manager.selectAll(['node-a', 'node-c'])
    expect(manager.selectedIds).toEqual(['node-a', 'node-c'])
  })

  it('notifies subscribers on selection changes', () => {
    const manager = new SelectionManager({ root: container })
    const listener = vi.fn<(detail: SelectionChangeDetail) => void>()

    const unsubscribe = manager.subscribe(listener)

    manager.select('node-a')
    expect(listener).toHaveBeenCalledWith({
      selectedIds: ['node-a'],
      added: ['node-a'],
      removed: [],
    })

    manager.select('node-b')
    expect(listener).toHaveBeenCalledWith({
      selectedIds: ['node-a', 'node-b'],
      added: ['node-b'],
      removed: [],
    })

    manager.deselect('node-a')
    expect(listener).toHaveBeenCalledWith({
      selectedIds: ['node-b'],
      added: [],
      removed: ['node-a'],
    })

    unsubscribe()
    manager.clear()
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('dispatches CustomEvent on host element when provided', () => {
    const host = document.createElement('div')
    const manager = new SelectionManager({ root: container, host })
    const hostSpy = vi.fn<() => void>()
    host.addEventListener('selection-change', hostSpy)

    manager.select('node-a')
    expect(hostSpy).toHaveBeenCalledTimes(1)

    manager.clear()
    expect(hostSpy).toHaveBeenCalledTimes(2)
  })

  it('supports selectInBox for marquee multi-selection', () => {
    const manager = new SelectionManager({ root: container })

    const nodes = [
      { id: 'node-a', x: 50, y: 50, width: 100, height: 80 },
      { id: 'node-b', x: 200, y: 50, width: 100, height: 80 },
      { id: 'node-c', x: 500, y: 500, width: 100, height: 80 },
    ]

    // Box enclosing node-a and node-b
    manager.selectInBox({ left: 0, top: 0, right: 350, bottom: 200 }, nodes, { additive: false })

    expect(manager.selectedIds).toEqual(['node-a', 'node-b'])
    expect(manager.isSelected('node-c')).toBe(false)

    // Additive marquee including node-c
    manager.selectInBox({ left: 450, top: 450, right: 650, bottom: 650 }, nodes, {
      additive: true,
      initialSelection: ['node-a', 'node-b'],
    })

    expect(manager.selectedIds).toEqual(['node-a', 'node-b', 'node-c'])
  })

  it('MultiSelectManager subclass initializes with multiple mode', () => {
    const manager = new MultiSelectManager({ root: container })
    expect(manager.mode).toBe('multiple')
    manager.select(['node-a', 'node-b'])
    expect(manager.count).toBe(2)
  })

  it('SelectionSystem maintains backwards compatibility', () => {
    const system = new SelectionSystem()
    system.selectNode('node-a', true)
    expect(system.getSelectedIds()).toEqual(['node-a'])

    system.selectNode('node-b', true)
    expect(system.getSelectedIds()).toEqual(['node-a', 'node-b'])

    system.selectNode('node-a', false)
    expect(system.getSelectedIds()).toEqual(['node-b'])

    system.clearSelection()
    expect(system.getSelectedIds()).toEqual([])
  })
})
