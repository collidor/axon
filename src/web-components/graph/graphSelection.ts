import type { AxonBoxType, LayoutEngine } from '../constants.js'
import { BOX_SELECTOR } from '../constants.js'
import type { SelectionManager } from '../../systems/selectionManager.js'
import type { ViewportTransformSystem } from '../../systems/viewportTransform.system.js'

export interface GraphSelectionHost {
  classList: DOMTokenList
  selectionManager: SelectionManager
  viewportTransform: ViewportTransformSystem
  layoutEngine: LayoutEngine | null
  autoSort: boolean
  getBoundingClientRect(): DOMRect
  requestDraw(): void
  syncEngineLayout(isInitial?: boolean): void
  updateState(): void
  queryScopedAll<T extends Element>(selector: string): T[]
}

/**
 * Controller managing single/multi-node pointer dragging, marquee rubber-band selection,
 * and coordination with the SelectionManager and LayoutEngine.
 */
export class GraphSelectionController {
  private readonly host: GraphSelectionHost
  private readonly selectionBoxElement: HTMLDivElement

  constructor(host: GraphSelectionHost, selectionBoxElement: HTMLDivElement) {
    this.host = host
    this.selectionBoxElement = selectionBoxElement
  }

  /**
   * Handles pointerdown on a node box, initiating single or multi-node dragging.
   */
  handleBoxPointerDown(pointerEvent: PointerEvent, clickedBox: AxonBoxType): void {
    pointerEvent.stopPropagation()
    const initialPointerScreenPosition = { x: pointerEvent.clientX, y: pointerEvent.clientY }
    const isShiftLeftClick = pointerEvent.shiftKey && pointerEvent.button === 0
    const isCtrlOrMeta = pointerEvent.ctrlKey || pointerEvent.metaKey
    const isAlreadySelected = this.host.selectionManager.isSelected(clickedBox.id)

    if (isShiftLeftClick) {
      this.host.selectionManager.select(clickedBox.id, { clearOthers: false })
    } else if (isCtrlOrMeta) {
      this.host.selectionManager.toggle(clickedBox.id)
    } else if (!isAlreadySelected) {
      this.host.selectionManager.select(clickedBox.id, { clearOthers: true })
    }

    const selectedBoxes = this.host
      .queryScopedAll<AxonBoxType>(BOX_SELECTOR)
      .filter((box) => this.host.selectionManager.isSelected(box.id))

    const initialNodePositions = selectedBoxes.map((box) => ({
      box,
      initialX: box.x,
      initialY: box.y,
    }))

    clickedBox.classList.add('dragging')
    this.host.classList.add('is-interacting')

    let didMoveBeyondThreshold = false

    const handlePointerMove = (moveEvent: PointerEvent) => {
      didMoveBeyondThreshold = true
      const deltaWorldX =
        (moveEvent.clientX - initialPointerScreenPosition.x) / this.host.viewportTransform.k
      const deltaWorldY =
        (moveEvent.clientY - initialPointerScreenPosition.y) / this.host.viewportTransform.k

      initialNodePositions.forEach(({ box, initialX, initialY }) => {
        box.moveTo(initialX + deltaWorldX, initialY + deltaWorldY)
        if (this.host.layoutEngine) {
          this.host.layoutEngine.updateDraggedNode(box)
        }
      })

      this.host.requestDraw()
    }

    const handlePointerUp = () => {
      clickedBox.classList.remove('dragging')
      this.host.classList.remove('is-interacting')
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)

      if (!didMoveBeyondThreshold && !isShiftLeftClick && !isCtrlOrMeta && isAlreadySelected) {
        this.host.selectionManager.select(clickedBox.id, { clearOthers: true })
      }
      if (this.host.autoSort) {
        this.host.syncEngineLayout(false)
        this.host.requestDraw()
      }
      this.host.updateState()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  /**
   * Handles canvas background pointerdown, rendering a marquee selection box.
   */
  handleSelectionBox(pointerEvent: PointerEvent): void {
    const containerRect = this.host.getBoundingClientRect()
    const startScreenX = pointerEvent.clientX - containerRect.left
    const startScreenY = pointerEvent.clientY - containerRect.top
    const isModifierPressed =
      pointerEvent.shiftKey || pointerEvent.ctrlKey || pointerEvent.metaKey
    const initialSelectedNodeIds = isModifierPressed ? this.host.selectionManager.selectedIds : []

    if (!isModifierPressed) {
      this.host.selectionManager.clearSelection()
    }

    this.host.classList.add('is-interacting')
    this.host.classList.add('is-box-selecting')

    this.selectionBoxElement.style.display = 'block'
    this.selectionBoxElement.style.left = `${startScreenX}px`
    this.selectionBoxElement.style.top = `${startScreenY}px`
    this.selectionBoxElement.style.width = '0px'
    this.selectionBoxElement.style.height = '0px'

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentRelativeX = moveEvent.clientX - containerRect.left
      const currentRelativeY = moveEvent.clientY - containerRect.top

      const boxLeft = Math.min(startScreenX, currentRelativeX)
      const boxTop = Math.min(startScreenY, currentRelativeY)
      const boxWidth = Math.abs(currentRelativeX - startScreenX)
      const boxHeight = Math.abs(currentRelativeY - startScreenY)

      this.selectionBoxElement.style.left = `${boxLeft}px`
      this.selectionBoxElement.style.top = `${boxTop}px`
      this.selectionBoxElement.style.width = `${boxWidth}px`
      this.selectionBoxElement.style.height = `${boxHeight}px`

      const worldTopLeft = this.host.viewportTransform.toWorld(boxLeft, boxTop)
      const worldBottomRight = this.host.viewportTransform.toWorld(
        boxLeft + boxWidth,
        boxTop + boxHeight,
      )

      const candidateBoxes = this.host.queryScopedAll<AxonBoxType>(BOX_SELECTOR)
      this.host.selectionManager.selectInBox(
        {
          left: worldTopLeft.x,
          top: worldTopLeft.y,
          right: worldBottomRight.x,
          bottom: worldBottomRight.y,
        },
        candidateBoxes.map((box) => ({
          id: box.id,
          x: box.x,
          y: box.y,
          width: box.offsetWidth || 0,
          height: box.offsetHeight || 0,
        })),
        {
          additive: isModifierPressed,
          initialSelection: initialSelectedNodeIds,
        },
      )
    }

    const handlePointerUp = () => {
      this.host.classList.remove('is-interacting')
      this.host.classList.remove('is-box-selecting')
      this.selectionBoxElement.style.display = 'none'
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }
}
