// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from './baseNodeElement'
import { TAG_NAMES } from '../constants'
import {
  createUmlTableNode,
  UmlTableNodeEngine,
  type UmlColumnData,
  type UmlColumnType,
  type UmlTableNodeData,
} from '../../nodes/umlTable.node'
import { NODE_TYPES } from '../../nodes/nodes.constants'

function formatDefaultValue(val: unknown): string {
  if (val === undefined || val === null || val === '') return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val)
  }
  return JSON.stringify(val)
}

export class AxonUmlTableNode extends AxonBaseNodeElement<UmlTableNodeEngine> {
  #activeContextMenuClose: (() => void) | null = null

  createEngine(options?: { id?: string; initialData?: any }): UmlTableNodeEngine {
    return createUmlTableNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.UML_TABLE
    this.setAttribute('data-node-type', NODE_TYPES.UML_TABLE)
    this.classList.add('axon-uml-table-node')
    super.connectedCallback()
  }

  private getTypeColor(type: string): string {
    switch (type?.toLowerCase()) {
      case 'integer':
      case 'number':
        return '#10b981' // emerald
      case 'string':
      case 'text':
        return '#38bdf8' // sky blue
      case 'boolean':
        return '#f59e0b' // amber
      case 'datetime':
        return '#ec4899' // pink
      case 'enum':
        return '#8b5cf6' // purple
      case 'struct':
      case 'json':
        return '#a855f7' // violet
      case 'array':
        return '#06b6d4' // cyan
      default:
        return '#94a3b8' // slate
    }
  }

  private getVisibilityIcon(visibility?: string): string {
    switch (visibility) {
      case 'SECRET':
        return '🔒'
      case 'GM_ONLY':
        return '🛡️'
      case 'PUBLIC':
      default:
        return '🌐'
    }
  }

  render() {
    const tableData: UmlTableNodeData = (this.engine as any)?.data ||
      this.nodeData ||
      this.data || {
        tableName: 'table_entity',
        displayName: 'Entity',
        storageClass: 'sqlite_table',
        columns: [],
      }

    const columns: UmlColumnData[] = tableData.columns || []
    const tableName = tableData.tableName || 'table_entity'
    const displayName = tableData.displayName || tableName
    const storageClass = tableData.storageClass || 'sqlite_table'

    const storageBadge =
      storageClass === 'sqlite_table'
        ? 'SQLite'
        : storageClass === 'entity_graph'
          ? 'Graph'
          : 'Struct'

    const storageIcon =
      storageClass === 'sqlite_table' ? '🗄️' : storageClass === 'entity_graph' ? '🕸️' : '📦'

    // Build the UML box HTML
    const columnsHtml = columns
      .map((col) => {
        const inPortId = this.engine?.getPortId(col.name) || `${this.id || 'table'}:${col.name}`
        const outPortId = this.engine?.getPortId(col.name) || `${this.id || 'table'}:${col.name}`
        const typeColor = this.getTypeColor(col.type)
        const visIcon = this.getVisibilityIcon(col.visibility)

        const isPk = Boolean(col.isPrimary)
        const isFk = Boolean(
          col.isForeignKey ||
          col.foreignKeyTable ||
          (!isPk && col.name.endsWith('_id')) ||
          (col.description && /fk|foreign key/i.test(col.description)),
        )

        // Render input port ONLY on Foreign Keys (left side)
        const inPortHtml = isFk
          ? /*html*/ `<axon-port-in
            id="${inPortId}"
            data-type="${col.type || 'any'}"
            class="uml-col-port-in is-fk-port"
            style="--port-color: #38bdf8;"
            title="Foreign Key: ${col.name}"
          ></axon-port-in>`
          : ''

        // Render output port ONLY on Primary Keys (right side)
        const outPortHtml = isPk
          ? /*html*/ `<axon-port-out
            id="${outPortId}"
            data-type="${col.type || 'any'}"
            class="uml-col-port-out is-pk-port"
            style="--port-color: #facc15;"
            title="Primary Key: ${col.name}"
          ></axon-port-out>`
          : ''

        const defaultValStr = formatDefaultValue(col.defaultValue)
        const defaultValBadge = defaultValStr
          ? `<span class="uml-col-default" title="Default: ${defaultValStr}"><span class="uml-default-eq">=</span>${defaultValStr}</span>`
          : ''

        return /*html*/ `
          <div class="uml-column-row ${isPk ? 'is-pk-row' : ''} ${isFk ? 'is-fk-row' : ''}" data-column-name="${col.name}">
            ${inPortHtml}

            <div class="uml-column-content">
              <span class="uml-col-flags">
                ${isPk ? '<span class="uml-badge pk" title="Primary Key">🔑 PK</span>' : ''}
                ${isFk ? '<span class="uml-badge fk" title="Foreign Key">🔗 FK</span>' : ''}
                ${col.isUnique && !isPk ? '<span class="uml-badge u" title="Unique">U</span>' : ''}
                ${col.isNullable ? '<span class="uml-badge null" title="Nullable">?</span>' : ''}
              </span>

              <span class="uml-col-name" title="${col.description || col.name}">
                <span class="vis-icon" title="Visibility: ${col.visibility || 'PUBLIC'}">${visIcon}</span>
                ${col.name}
                ${defaultValBadge}
              </span>

              <select
                class="uml-col-type-select"
                data-column-name="${col.name}"
                style="color: ${typeColor}; border-color: ${typeColor}60; background: ${typeColor}15;"
                title="Field Type (${col.type})"
              >
                <option value="string" ${col.type === 'string' ? 'selected' : ''}>STRING</option>
                <option value="integer" ${col.type === 'integer' ? 'selected' : ''}>INTEGER</option>
                <option value="number" ${col.type === 'number' ? 'selected' : ''}>NUMBER</option>
                <option value="boolean" ${col.type === 'boolean' ? 'selected' : ''}>BOOLEAN</option>
                <option value="datetime" ${col.type === 'datetime' ? 'selected' : ''}>DATETIME</option>
                <option value="text" ${col.type === 'text' ? 'selected' : ''}>TEXT</option>
                <option value="json" ${col.type === 'json' ? 'selected' : ''}>JSON</option>
                <option value="enum" ${col.type === 'enum' ? 'selected' : ''}>ENUM</option>
                <option value="struct" ${col.type === 'struct' ? 'selected' : ''}>STRUCT</option>
                <option value="array" ${col.type === 'array' ? 'selected' : ''}>ARRAY</option>
              </select>
            </div>

            ${outPortHtml}
          </div>
        `
      })
      .join('')

    this.innerHTML = /*html*/ `
      <div class="uml-table-wrapper">
        <!-- UML Header -->
        <div class="uml-table-header">
          <div class="uml-stereotype">&lt;&lt;${storageBadge}: ${tableName}&gt;&gt;</div>
          <div class="uml-title-row">
            <div class="uml-title-group">
              <span class="uml-storage-icon">${storageIcon}</span>
              <h3 class="uml-table-title">${displayName}</h3>
            </div>
            <span class="uml-col-count-pill">${columns.length} cols</span>
          </div>
        </div>

        <!-- UML Columns Compartment -->
        <div class="uml-columns-compartment">
          ${columnsHtml.length > 0 ? columnsHtml : '<div class="uml-empty-cols">No columns defined</div>'}
        </div>

        <!-- UML Footer / Quick Actions -->
        <div class="uml-table-footer">
          <button class="uml-mini-add-btn" data-action="add-column" title="Add Field">+ Field</button>
          <button class="uml-mini-edit-btn" data-action="edit-table" title="Configure Table">⚙️</button>
        </div>
      </div>
    `

    // Wire inline type selects
    const typeSelects = this.querySelectorAll<HTMLSelectElement>('.uml-col-type-select')
    typeSelects.forEach((sel) => {
      sel.addEventListener('change', (e) => {
        e.stopPropagation()
        const colName = sel.getAttribute('data-column-name')
        const newType = sel.value as UmlColumnType
        const col = columns.find((c) => c.name === colName)
        if (col && col.type !== newType) {
          const oldType = col.type
          col.type = newType
          this.dispatchEvent(
            new CustomEvent('ui-update-column', {
              bubbles: true,
              composed: true,
              detail: {
                tableId: this.id,
                tableName,
                columnName: col.name,
                patch: { type: newType },
                previous: { type: oldType },
                column: JSON.parse(JSON.stringify(col)),
              },
            }),
          )
          this.render()
        }
      })
    })

    // Wire right-click context menu on column rows
    const rows = this.querySelectorAll<HTMLElement>('.uml-column-row')
    rows.forEach((row) => {
      row.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const colName = row.getAttribute('data-column-name')
        const col = columns.find((c) => c.name === colName)
        if (col) {
          this.showColumnContextMenu(e, col, tableName)
        }
      })
    })

    // Wire quick button actions
    const addBtn = this.querySelector<HTMLButtonElement>('[data-action="add-column"]')
    addBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.dispatchEvent(
        new CustomEvent('ui-add-column', {
          bubbles: true,
          composed: true,
          detail: { tableId: this.id, tableName },
        }),
      )
    })

    const editBtn = this.querySelector<HTMLButtonElement>('[data-action="edit-table"]')
    editBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.dispatchEvent(
        new CustomEvent('ui-edit-table', {
          bubbles: true,
          composed: true,
          detail: { tableId: this.id, tableName, tableData },
        }),
      )
    })
  }

  private showColumnContextMenu(e: MouseEvent, col: UmlColumnData, tableName: string) {
    document.querySelectorAll('.uml-row-context-menu').forEach((el) => el.remove())

    const menu = document.createElement('div')
    menu.className = 'uml-row-context-menu'
    menu.style.position = 'fixed'
    menu.style.left = `${e.clientX}px`
    menu.style.top = `${e.clientY}px`
    menu.style.zIndex = '99999'

    const isPk = Boolean(col.isPrimary)
    const isFk = Boolean(col.isForeignKey)
    const isUnique = Boolean(col.isUnique)
    const isNullable = Boolean(col.isNullable)
    const visibility = col.visibility || 'PUBLIC'

    menu.innerHTML = `
      <div class="uml-menu-header">
        <span class="uml-menu-field-name">${col.name}</span>
        <span class="uml-menu-field-type">${col.type.toUpperCase()}</span>
      </div>
      <div class="uml-menu-divider"></div>
      <button class="uml-menu-item ${isPk ? 'is-active' : ''}" data-action="toggle-pk">
        <span class="uml-menu-icon">🔑</span>
        <span class="uml-menu-label">Primary Key (PK)</span>
        <span class="uml-menu-check">${isPk ? '✓' : ''}</span>
      </button>
      <button class="uml-menu-item ${isFk ? 'is-active' : ''}" data-action="toggle-fk">
        <span class="uml-menu-icon">🔗</span>
        <span class="uml-menu-label">Foreign Key (FK)</span>
        <span class="uml-menu-check">${isFk ? '✓' : ''}</span>
      </button>
      <button class="uml-menu-item ${isUnique ? 'is-active' : ''}" data-action="toggle-unique">
        <span class="uml-menu-icon">🔤</span>
        <span class="uml-menu-label">Unique Constraint (U)</span>
        <span class="uml-menu-check">${isUnique ? '✓' : ''}</span>
      </button>
      <button class="uml-menu-item ${isNullable ? 'is-active' : ''}" data-action="toggle-nullable">
        <span class="uml-menu-icon">❓</span>
        <span class="uml-menu-label">Nullable</span>
        <span class="uml-menu-check">${isNullable ? '✓' : ''}</span>
      </button>
      <div class="uml-menu-divider"></div>
      <div class="uml-menu-label-section">Visibility</div>
      <div class="uml-menu-visibility-row">
        <button class="uml-vis-btn ${visibility === 'PUBLIC' ? 'is-active' : ''}" data-vis="PUBLIC" title="Public (All)">🌐 Public</button>
        <button class="uml-vis-btn ${visibility === 'GM_ONLY' ? 'is-active' : ''}" data-vis="GM_ONLY" title="GM Only">🛡️ GM</button>
        <button class="uml-vis-btn ${visibility === 'SECRET' ? 'is-active' : ''}" data-vis="SECRET" title="Secret">🔒 Secret</button>
      </div>
      <div class="uml-menu-divider"></div>
      <div class="uml-menu-label-section">Default Value</div>
      <div class="uml-menu-default-row" style="display: flex; gap: 4px; padding: 4px 8px;">
        <input
          type="text"
          class="uml-default-val-input"
          placeholder="e.g. 10 or 'Active'"
          value="${formatDefaultValue(col.defaultValue)}"
          style="flex: 1; min-width: 0; background: #0f141c; border: 1px solid #334155; color: #fff; font-size: 0.72rem; padding: 3px 6px; border-radius: 4px;"
        />
        <button
          class="uml-default-val-btn"
          style="background: #38bdf8; border: none; color: #000; font-weight: 600; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; cursor: pointer;"
        >Set</button>
      </div>
      <div class="uml-menu-divider"></div>
      <button class="uml-menu-item danger" data-action="delete-column">
        <span class="uml-menu-icon">🗑️</span>
        <span class="uml-menu-label">Delete Field</span>
      </button>
    `

    this.#activeContextMenuClose?.()

    document.body.appendChild(menu)

    const rect = menu.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      menu.style.left = `${Math.max(10, window.innerWidth - rect.width - 10)}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${Math.max(10, window.innerHeight - rect.height - 10)}px`
    }

    menu.setAttribute('tabindex', '-1')

    const close = () => {
      this.#activeContextMenuClose = null
      menu.remove()
      window.removeEventListener('pointerdown', handleOutsidePointer, true)
      window.removeEventListener('contextmenu', handleOutsidePointer, true)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('blur', handleBlur)
    }
    this.#activeContextMenuClose = close

    const handleOutsidePointer = (pe: Event) => {
      if (!menu.contains(pe.target as Node)) {
        close()
      }
    }

    const handleBlur = () => {
      close()
    }

    const handleKey = (ke: KeyboardEvent) => {
      if (ke.key === 'Escape') close()
    }

    menu.addEventListener('focusout', (fe: FocusEvent) => {
      if (fe.relatedTarget && !menu.contains(fe.relatedTarget as Node)) {
        close()
      }
    })

    window.addEventListener('blur', handleBlur)
    menu.focus()

    setTimeout(() => {
      window.addEventListener('pointerdown', handleOutsidePointer, true)
      window.addEventListener('contextmenu', handleOutsidePointer, true)
      window.addEventListener('keydown', handleKey)
    }, 10)

    const dispatchUpdate = (patch: Partial<UmlColumnData>, previous: Partial<UmlColumnData>) => {
      Object.assign(col, patch)
      close()
      this.dispatchEvent(
        new CustomEvent('ui-update-column', {
          bubbles: true,
          composed: true,
          detail: {
            tableId: this.id,
            tableName,
            columnName: col.name,
            patch,
            previous,
            column: JSON.parse(JSON.stringify(col)),
          },
        }),
      )
      this.render()
    }

    menu.querySelector('[data-action="toggle-pk"]')?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const newPk = !isPk
      const patch: Partial<UmlColumnData> = { isPrimary: newPk }
      const prev: Partial<UmlColumnData> = { isPrimary: isPk }
      if (newPk) {
        patch.isNullable = false
        prev.isNullable = isNullable
      }
      dispatchUpdate(patch, prev)
    })

    menu.querySelector('[data-action="toggle-fk"]')?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      dispatchUpdate({ isForeignKey: !isFk }, { isForeignKey: isFk })
    })

    menu.querySelector('[data-action="toggle-unique"]')?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      dispatchUpdate({ isUnique: !isUnique }, { isUnique: isUnique })
    })

    menu.querySelector('[data-action="toggle-nullable"]')?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const newNullable = !isNullable
      const patch: Partial<UmlColumnData> = { isNullable: newNullable }
      const prev: Partial<UmlColumnData> = { isNullable }
      if (newNullable && isPk) {
        patch.isPrimary = false
        prev.isPrimary = true
      }
      dispatchUpdate(patch, prev)
    })

    menu.querySelectorAll<HTMLButtonElement>('[data-vis]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const newVis = btn.getAttribute('data-vis') as any
        if (newVis && newVis !== visibility) {
          dispatchUpdate({ visibility: newVis }, { visibility })
        }
      })
    })

    const defaultInput = menu.querySelector<HTMLInputElement>('.uml-default-val-input')
    const applyDefault = () => {
      if (!defaultInput) return
      const rawVal = defaultInput.value.trim()
      let parsedVal: unknown = rawVal
      if (rawVal === '') {
        parsedVal = undefined
      } else if (rawVal === 'true') {
        parsedVal = true
      } else if (rawVal === 'false') {
        parsedVal = false
      } else if (!Number.isNaN(Number(rawVal)) && !rawVal.includes(' ')) {
        parsedVal = Number(rawVal)
      }
      dispatchUpdate({ defaultValue: parsedVal }, { defaultValue: col.defaultValue })
    }

    menu.querySelector('.uml-default-val-btn')?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      applyDefault()
    })

    defaultInput?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.stopPropagation()
        applyDefault()
      }
    })

    menu.querySelector('[data-action="delete-column"]')?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      close()
      this.dispatchEvent(
        new CustomEvent('ui-delete-column', {
          bubbles: true,
          composed: true,
          detail: {
            tableId: this.id,
            tableName,
            columnName: col.name,
          },
        }),
      )
    })
  }

  override disconnectedCallback() {
    this.#activeContextMenuClose?.()
    this.#activeContextMenuClose = null
    document.querySelectorAll('.uml-row-context-menu').forEach((el) => el.remove())
    super.disconnectedCallback()
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_UML_TABLE_NODE)) {
  customElements.define(TAG_NAMES.AXON_UML_TABLE_NODE, AxonUmlTableNode)
}
