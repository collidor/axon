export interface SelectableElement {
  id: string
  classList?: {
    add(...tokens: string[]): void
    remove(...tokens: string[]): void
  }
}

export type SelectionMode = 'multiple' | 'single'

export interface SelectionChangeDetail {
  selectedIds: string[]
  added: string[]
  removed: string[]
}

export type SelectionChangeCallback = (detail: SelectionChangeDetail) => void

export interface SelectionManagerOptions {
  mode?: SelectionMode
  root?: Document | ShadowRoot | HTMLElement | null
  resolveElement?: (id: string) => HTMLElement | null
  classNames?: {
    isSelected?: string
  }
  host?: EventTarget | null
}

export interface BoxBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface NodePositionCandidate {
  id: string
  x: number
  y: number
  width?: number
  height?: number
}

export class SelectionManager {
  #selectedIds: Set<string> = new Set()
  #listeners: Set<SelectionChangeCallback> = new Set()

  public mode: SelectionMode = 'multiple'
  public root: Document | ShadowRoot | HTMLElement | null = null
  public resolveElement?: (id: string) => HTMLElement | null
  public host: EventTarget | null = null

  public classNames = {
    isSelected: 'is-selected',
  }

  constructor(options?: SelectionManagerOptions) {
    if (options) {
      if (options.mode) this.mode = options.mode
      if (options.root !== undefined) this.root = options.root
      if (options.resolveElement) this.resolveElement = options.resolveElement
      if (options.host !== undefined) this.host = options.host
      if (options.classNames?.isSelected) {
        this.classNames.isSelected = options.classNames.isSelected
      }
    }
  }

  public get selectedIds(): string[] {
    return Array.from(this.#selectedIds)
  }

  public get count(): number {
    return this.#selectedIds.size
  }

  public get hasSelection(): boolean {
    return this.#selectedIds.size > 0
  }

  public getSelectedIds(): string[] {
    return this.selectedIds
  }

  public isSelected(id: string): boolean {
    return this.#selectedIds.has(id)
  }

  public setMode(mode: SelectionMode): void {
    this.mode = mode
    if (mode === 'single' && this.#selectedIds.size > 1) {
      const first = Array.from(this.#selectedIds)[0]
      if (first) {
        this.setSelection([first])
      } else {
        this.clearSelection()
      }
    }
  }

  public select(
    idOrIds: string | string[],
    options?: { clearOthers?: boolean; emit?: boolean },
  ): void {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds]
    if (ids.length === 0) return

    const shouldClear = options?.clearOthers ?? this.mode === 'single'
    const added: string[] = []
    const removed: string[] = []

    if (shouldClear) {
      const idsToKeep = new Set(this.mode === 'single' ? [ids[ids.length - 1]] : ids)
      for (const existingId of this.#selectedIds) {
        if (!idsToKeep.has(existingId)) {
          this.#selectedIds.delete(existingId)
          this.#updateElementClass(existingId, false)
          removed.push(existingId)
        }
      }
    }

    const targetIds = this.mode === 'single' ? [ids[ids.length - 1]] : ids
    for (const id of targetIds) {
      if (!this.#selectedIds.has(id)) {
        this.#selectedIds.add(id)
        this.#updateElementClass(id, true)
        added.push(id)
      }
    }

    if (options?.emit !== false && (added.length > 0 || removed.length > 0)) {
      this.#notifyChange(added, removed)
    }
  }

  public deselect(idOrIds: string | string[], options?: { emit?: boolean }): void {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds]
    const removed: string[] = []

    for (const id of ids) {
      if (this.#selectedIds.has(id)) {
        this.#selectedIds.delete(id)
        this.#updateElementClass(id, false)
        removed.push(id)
      }
    }

    if (options?.emit !== false && removed.length > 0) {
      this.#notifyChange([], removed)
    }
  }

  public toggle(id: string, options?: { clearOthers?: boolean; emit?: boolean }): void {
    if (this.isSelected(id)) {
      this.deselect(id, options)
    } else {
      this.select(id, options)
    }
  }

  public selectNode(id: string, isSelected: boolean): void {
    if (isSelected) {
      this.select(id, { clearOthers: false })
    } else {
      this.deselect(id)
    }
  }

  public selectAll(ids?: string[], options?: { emit?: boolean }): void {
    if (this.mode === 'single') return

    let targetIds = ids
    if (!targetIds && this.root && 'querySelectorAll' in this.root) {
      const elements = this.root.querySelectorAll<HTMLElement>('[id]')
      targetIds = Array.from(elements)
        .map((el) => el.id)
        .filter(Boolean)
    }

    if (targetIds && targetIds.length > 0) {
      this.select(targetIds, { clearOthers: false, emit: options?.emit })
    }
  }

  public setSelection(ids: string[], options?: { emit?: boolean }): void {
    const newSet = new Set(this.mode === 'single' ? (ids.length > 0 ? [ids[0]] : []) : ids)
    const added: string[] = []
    const removed: string[] = []

    for (const existingId of this.#selectedIds) {
      if (!newSet.has(existingId)) {
        this.#selectedIds.delete(existingId)
        this.#updateElementClass(existingId, false)
        removed.push(existingId)
      }
    }

    for (const id of newSet) {
      if (!this.#selectedIds.has(id)) {
        this.#selectedIds.add(id)
        this.#updateElementClass(id, true)
        added.push(id)
      }
    }

    if (options?.emit !== false && (added.length > 0 || removed.length > 0)) {
      this.#notifyChange(added, removed)
    }
  }

  public clearSelection(options?: { emit?: boolean }): void {
    if (this.#selectedIds.size === 0) return

    const removed = Array.from(this.#selectedIds)
    for (const id of removed) {
      this.#updateElementClass(id, false)
    }
    this.#selectedIds.clear()

    if (options?.emit !== false) {
      this.#notifyChange([], removed)
    }
  }

  public clear(options?: { emit?: boolean }): void {
    this.clearSelection(options)
  }

  /**
   * Helper for box/marquee multi-selection.
   * Tests each candidate node against the given rectangular box bounds in world coordinates.
   */
  public selectInBox(
    boxBounds: BoxBounds,
    nodes: NodePositionCandidate[],
    options?: {
      additive?: boolean
      initialSelection?: string[]
      emit?: boolean
    },
  ): void {
    if (this.mode === 'single') return

    const minX = Math.min(boxBounds.left, boxBounds.right)
    const maxX = Math.max(boxBounds.left, boxBounds.right)
    const minY = Math.min(boxBounds.top, boxBounds.bottom)
    const maxY = Math.max(boxBounds.top, boxBounds.bottom)

    const baseSelection = new Set(
      options?.additive ? (options?.initialSelection ?? this.selectedIds) : [],
    )

    const newSelectedIds: string[] = Array.from(baseSelection)

    for (const node of nodes) {
      const nodeW = node.width ?? 0
      const nodeH = node.height ?? 0

      // Node bounding box
      const nLeft = node.x
      const nTop = node.y
      const nRight = node.x + nodeW
      const nBottom = node.y + nodeH

      // Intersect or point inside test
      const inBox =
        nodeW > 0 || nodeH > 0
          ? nLeft <= maxX && nRight >= minX && nTop <= maxY && nBottom >= minY
          : node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY

      if (inBox) {
        if (!baseSelection.has(node.id)) {
          newSelectedIds.push(node.id)
        }
      }
    }

    this.setSelection(newSelectedIds, { emit: options?.emit })
  }

  public subscribe(callback: SelectionChangeCallback): () => void {
    this.#listeners.add(callback)
    return () => {
      this.#listeners.delete(callback)
    }
  }

  public onSelectionChange(callback: SelectionChangeCallback): () => void {
    return this.subscribe(callback)
  }

  public resolveNode(id: string): HTMLElement | null {
    if (this.resolveElement) {
      const resolved = this.resolveElement(id)
      if (resolved) return resolved
    }

    if (this.root) {
      if ('getElementById' in this.root && typeof this.root.getElementById === 'function') {
        const el = (this.root as Document | ShadowRoot).getElementById(id)
        if (el) return el as HTMLElement
      }
      if ('querySelector' in this.root && typeof this.root.querySelector === 'function') {
        try {
          const escaped =
            typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id
          const el = this.root.querySelector<HTMLElement>(`#${escaped}`)
          if (el) return el
        } catch {
          const el = this.root.querySelector<HTMLElement>(`[id="${id}"]`)
          if (el) return el
        }
      }
    }

    if (typeof document !== 'undefined') {
      return document.getElementById(id)
    }

    return null
  }

  #updateElementClass(id: string, isSelected: boolean): void {
    const el = this.resolveNode(id)
    if (!el || !el.classList) return

    if (isSelected) {
      el.classList.add(this.classNames.isSelected)
      if (this.classNames.isSelected !== 'selected') {
        el.classList.add('selected')
      }
    } else {
      el.classList.remove(this.classNames.isSelected)
      if (this.classNames.isSelected !== 'selected') {
        el.classList.remove('selected')
      }
    }
  }

  #notifyChange(added: string[], removed: string[]): void {
    const detail: SelectionChangeDetail = {
      selectedIds: this.selectedIds,
      added,
      removed,
    }

    for (const listener of this.#listeners) {
      listener(detail)
    }

    if (this.host && typeof this.host.dispatchEvent === 'function') {
      const event =
        typeof CustomEvent !== 'undefined'
          ? new CustomEvent('selection-change', {
              detail,
              bubbles: true,
              composed: true,
            })
          : ({ type: 'selection-change', detail } as any)
      this.host.dispatchEvent(event)
    }
  }
}

/**
 * MultiSelectManager defaults to mode 'multiple' and provides multi-selection capabilities.
 */
export class MultiSelectManager extends SelectionManager {
  constructor(options?: SelectionManagerOptions) {
    super({ ...options, mode: options?.mode ?? 'multiple' })
  }
}

/**
 * SelectionSystem extends SelectionManager for backwards compatibility.
 */
export class SelectionSystem extends SelectionManager {}
