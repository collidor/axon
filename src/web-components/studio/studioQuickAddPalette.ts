import type { AxonGraph } from '../axonGraph.component.js'
import {
  NODE_PALETTE_CATEGORIES,
  type NodePaletteItem,
} from './studioPaletteData.js'

export interface QuickAddHost {
  graph: AxonGraph | null
  spawnNode(type: string, x?: number, y?: number, data?: Record<string, unknown>): string
}

/**
 * Controller managing the quick-add floating search popup, keyword filtering,
 * keyboard shortcuts, and direct canvas node instantiation.
 */
export class StudioQuickAddController {
  private readonly host: QuickAddHost
  private modalElement: HTMLElement | null = null
  private searchInputElement: HTMLInputElement | null = null
  private resultsContainerElement: HTMLElement | null = null
  private cursorPosition = { x: 200, y: 200 }
  private outsideClickHandler: ((event: Event) => void) | null = null

  constructor(host: QuickAddHost) {
    this.host = host
  }

  public bindElements(elements: {
    modal: HTMLElement | null
    searchInput: HTMLInputElement | null
    resultsContainer: HTMLElement | null
  }): void {
    this.modalElement = elements.modal
    this.searchInputElement = elements.searchInput
    this.resultsContainerElement = elements.resultsContainer
  }

  /**
   * Opens the floating quick-add palette at the specified screen coordinates.
   */
  public open(clientX: number, clientY: number): void {
    if (!this.modalElement || !this.searchInputElement) return
    this.cursorPosition = { x: clientX, y: clientY }

    this.modalElement.style.left = `${Math.min(clientX, window.innerWidth - 300)}px`
    this.modalElement.style.top = `${Math.min(clientY, window.innerHeight - 350)}px`
    this.modalElement.style.display = 'block'
    this.searchInputElement.value = ''
    this.renderResults('')
    this.searchInputElement.focus()

    this.searchInputElement.oninput = () => {
      this.renderResults(this.searchInputElement?.value.toLowerCase() || '')
    }

    if (!this.outsideClickHandler) {
      this.outsideClickHandler = (event: Event) => {
        const targetElement = (
          event.composedPath ? event.composedPath()[0] : event.target
        ) as Node | null
        if (this.modalElement && targetElement && !this.modalElement.contains(targetElement)) {
          this.close()
        }
      }
      setTimeout(() => {
        if (this.outsideClickHandler) {
          window.addEventListener('pointerdown', this.outsideClickHandler, true)
          window.addEventListener('mousedown', this.outsideClickHandler, true)
        }
      }, 0)
    }
  }

  /**
   * Closes the floating quick-add palette and unbinds outside click listeners.
   */
  public close(): void {
    if (this.modalElement) {
      this.modalElement.style.display = 'none'
    }
    if (this.outsideClickHandler) {
      window.removeEventListener('pointerdown', this.outsideClickHandler, true)
      window.removeEventListener('mousedown', this.outsideClickHandler, true)
      this.outsideClickHandler = null
    }
  }

  /**
   * Renders filtered palette items inside the quick-add results container.
   */
  public renderResults(searchQuery: string): void {
    const resultsContainer = this.resultsContainerElement
    if (!resultsContainer) return
    resultsContainer.innerHTML = ''

    const allPaletteItems: NodePaletteItem[] = []
    NODE_PALETTE_CATEGORIES.forEach((category) => allPaletteItems.push(...category.items))

    const matchingItems = allPaletteItems.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery) ||
        item.type.toLowerCase().includes(searchQuery),
    )

    matchingItems.slice(0, 8).forEach((item) => {
      const resultRowElement = document.createElement('div')
      resultRowElement.className = 'quick-add-row'
      resultRowElement.innerHTML = `<span class="quick-add-icon">${item.icon}</span> <span>${item.label}</span>`
      resultRowElement.addEventListener('click', () => {
        let spawnX = this.cursorPosition.x
        let spawnY = this.cursorPosition.y
        if (this.host.graph) {
          const rect = this.host.graph.getBoundingClientRect()
          const relX = this.cursorPosition.x - rect.left
          const relY = this.cursorPosition.y - rect.top
          const world = this.host.graph.viewportTransform
            ? this.host.graph.viewportTransform.toWorld(relX, relY)
            : { x: relX, y: relY }
          spawnX = world.x
          spawnY = world.y
        }
        this.host.spawnNode(item.type, spawnX, spawnY, item.initialData)
        this.close()
      })
      resultsContainer.appendChild(resultRowElement)
    })
  }
}
