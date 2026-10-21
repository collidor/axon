// oxlint-disable typescript/no-explicit-any

export interface BreadcrumbItem {
  id: string
  label: string
  nodeId?: string
  graphData?: any
}

/**
 * <axon-breadcrumbs>
 * Visual breadcrumb navigation trail for nested Subgraph layers in Axon Studio.
 *
 * Emits 'breadcrumb-select' CustomEvent with { index, item } when a breadcrumb is clicked.
 */
export class AxonBreadcrumbs extends HTMLElement {
  #items: BreadcrumbItem[] = [{ id: 'root', label: 'Root Graph' }]

  static get observedAttributes() {
    return ['current']
  }

  constructor() {
    super()
  }

  connectedCallback() {
    this.render()
  }

  public get items(): BreadcrumbItem[] {
    return this.#items
  }

  public set items(newItems: BreadcrumbItem[]) {
    this.#items = newItems && newItems.length > 0 ? newItems : [{ id: 'root', label: 'Root Graph' }]
    this.render()
  }

  public pushCrumb(item: BreadcrumbItem): void {
    this.#items.push(item)
    this.render()
  }

  public popCrumb(): BreadcrumbItem | undefined {
    if (this.#items.length <= 1) return undefined
    const popped = this.#items.pop()
    this.render()
    return popped
  }

  public reset(): void {
    this.#items = [{ id: 'root', label: 'Root Graph' }]
    this.render()
  }

  public get currentCrumb(): BreadcrumbItem {
    return this.#items[this.#items.length - 1]
  }

  public get depth(): number {
    return this.#items.length - 1
  }

  render() {
    this.innerHTML = `
      <nav class="axon-breadcrumbs" aria-label="Graph hierarchy navigation">
        <ol class="breadcrumb-list">
          ${this.#items
            .map((item, idx) => {
              const isLast = idx === this.#items.length - 1
              return `
                <li class="breadcrumb-item ${isLast ? 'is-current' : ''}">
                  ${
                    isLast
                      ? `<span class="breadcrumb-current" aria-current="page">${item.label}</span>`
                      : `<button type="button" class="breadcrumb-link" data-index="${idx}" title="Navigate up to ${item.label}">
                          ${item.label}
                        </button>`
                  }
                  ${!isLast ? `<span class="breadcrumb-separator" aria-hidden="true">›</span>` : ''}
                </li>
              `
            })
            .join('')}
        </ol>
      </nav>
    `

    this.querySelectorAll<HTMLButtonElement>('.breadcrumb-link').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const idx = Number(btn.getAttribute('data-index'))
        if (!isNaN(idx) && idx >= 0 && idx < this.#items.length) {
          const selectedItem = this.#items[idx]
          this.dispatchEvent(
            new CustomEvent('breadcrumb-select', {
              detail: { index: idx, item: selectedItem },
              bubbles: true,
              composed: true,
            }),
          )
        }
      })
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('axon-breadcrumbs')) {
  customElements.define('axon-breadcrumbs', AxonBreadcrumbs)
}
