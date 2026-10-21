import type { ViewportTransformSystem } from '../../systems/viewportTransform.system.js'
import type { AxonBoxType } from '../constants.js'
import { getEffectiveNodeHeight } from '../../systems/magneticDAGEngine.system.js'

export interface GraphViewportHost {
  readonly clientWidth: number
  readonly clientHeight: number
  getBoundingClientRect(): DOMRect
  style: CSSStyleDeclaration
  classList: DOMTokenList
  dispatchEvent(event: Event): boolean
  requestDraw(): void
}

/**
 * Controller managing viewport panning, zooming, and dynamic Level-of-Detail (LOD) grid rendering.
 */
export class GraphViewportController {
  private readonly host: GraphViewportHost
  private readonly viewportContainer: HTMLDivElement
  public readonly transformSystem: ViewportTransformSystem

  constructor(
    host: GraphViewportHost,
    viewportContainer: HTMLDivElement,
    transformSystem: ViewportTransformSystem,
  ) {
    this.host = host
    this.viewportContainer = viewportContainer
    this.transformSystem = transformSystem
  }

  /**
   * Updates CSS transform matrix on the viewport container and recalculates
   * multi-octave Level-of-Detail (LOD) background dot grid styling.
   */
  updateView(): void {
    if (!this.viewportContainer) return
    const { k: zoomScale, x: panTranslationX, y: panTranslationY } = this.transformSystem

    // Set container matrix transform for high-performance hardware accelerated panning & zooming
    this.viewportContainer.style.transformOrigin = '0 0'
    this.viewportContainer.style.transform = `matrix(${zoomScale}, 0, 0, ${zoomScale}, ${panTranslationX}, ${panTranslationY})`

    // Smooth dynamic Level-Of-Detail (LOD) grid calculation:
    // We compute logarithmic octaves so micro-dots gracefully cross-fade into macro-dots without visual popping.
    const baseGridSpacing = 20
    const octaveRatio = 4
    const logarithmicZoom = Math.log(zoomScale) / Math.log(octaveRatio)
    const octaveLevel = Math.floor(logarithmicZoom)
    const fractionalRemainder = logarithmicZoom - octaveLevel

    const smallWorldStep = baseGridSpacing * Math.pow(octaveRatio, -octaveLevel)
    const bigWorldStep = smallWorldStep * octaveRatio

    const smallScreenStep = smallWorldStep * zoomScale
    const bigScreenStep = bigWorldStep * zoomScale

    // Smooth opacity cross-fade between octaves
    const smallDotAlpha = Math.min(0.4, Math.max(0, fractionalRemainder * 0.4))
    const bigDotAlpha = 0.35 + (1 - fractionalRemainder) * 0.15

    // Independent alignment offsets for macro and micro grid layers
    const smallOffsetX = ((panTranslationX % smallScreenStep) + smallScreenStep) % smallScreenStep
    const smallOffsetY = ((panTranslationY % smallScreenStep) + smallScreenStep) % smallScreenStep
    const bigOffsetX = ((panTranslationX % bigScreenStep) + bigScreenStep) % bigScreenStep
    const bigOffsetY = ((panTranslationY % bigScreenStep) + bigScreenStep) % bigScreenStep

    const bigDotPercentage = Math.round(bigDotAlpha * 100)
    const smallDotPercentage = Math.round(smallDotAlpha * 100)

    this.host.style.setProperty(
      'background-image',
      `radial-gradient(circle at 1.5px 1.5px, color-mix(in srgb, var(--ndd-background-dot-big, #94a3b8) ${bigDotPercentage}%, transparent) 1.25px, transparent 1.35px), radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--ndd-background-dot-small, #475569) ${smallDotPercentage}%, transparent) 0.9px, transparent 1.0px)`,
    )
    this.host.style.setProperty(
      'background-size',
      `${bigScreenStep}px ${bigScreenStep}px, ${smallScreenStep}px ${smallScreenStep}px`,
    )
    this.host.style.setProperty(
      'background-position',
      `${bigOffsetX}px ${bigOffsetY}px, ${smallOffsetX}px ${smallOffsetY}px`,
    )

    this.host.dispatchEvent(new CustomEvent('zoom-change', { detail: zoomScale }))
    this.host.requestDraw()
  }

  /**
   * Handles pointer pan drag gestures.
   */
  handlePan(initialPointerEvent: PointerEvent): void {
    let lastScreenPointerX = initialPointerEvent.clientX
    let lastScreenPointerY = initialPointerEvent.clientY
    this.host.classList.add('is-interacting')
    this.host.classList.add('is-panning')

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - lastScreenPointerX
      const deltaY = moveEvent.clientY - lastScreenPointerY
      lastScreenPointerX = moveEvent.clientX
      lastScreenPointerY = moveEvent.clientY
      this.transformSystem.pan(deltaX, deltaY)
      this.updateView()
    }

    const handlePointerUp = () => {
      this.host.classList.remove('is-interacting')
      this.host.classList.remove('is-panning')
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  /**
   * Handles mouse wheel zooming centered around the pointer location.
   */
  handleWheel(wheelEvent: WheelEvent): void {
    wheelEvent.preventDefault()
    const containerBoundingRect = this.host.getBoundingClientRect()
    const cursorRelativeX = wheelEvent.clientX - containerBoundingRect.left
    const cursorRelativeY = wheelEvent.clientY - containerBoundingRect.top
    const zoomFactor = Math.pow(0.999, wheelEvent.deltaY)
    this.transformSystem.zoomAt(cursorRelativeX, cursorRelativeY, zoomFactor)
    this.updateView()
  }

  /**
   * Centers and scales graph nodes in the viewport with configurable column margins.
   */
  autoZoom(boxes: AxonBoxType[], columnWidth = 300, paddingColumns = 1): void {
    if (boxes.length === 0) {
      this.transformSystem.k = 1
      this.transformSystem.x = 0
      this.transformSystem.y = 0
      this.updateView()
      return
    }

    const paddingX = columnWidth * paddingColumns
    const paddingY = 80

    let minWorldX = Infinity
    let maxWorldX = -Infinity
    let minWorldY = Infinity
    let maxWorldY = -Infinity

    boxes.forEach((box) => {
      const boxPositionX = box.x ?? 0
      const boxPositionY = box.y ?? 0
      const boxWidth = box.offsetWidth || 230
      const boxHeight = box.offsetHeight || getEffectiveNodeHeight(box) || 150

      if (boxPositionX < minWorldX) minWorldX = boxPositionX
      if (boxPositionX + boxWidth > maxWorldX) maxWorldX = boxPositionX + boxWidth
      if (boxPositionY < minWorldY) minWorldY = boxPositionY
      if (boxPositionY + boxHeight > maxWorldY) maxWorldY = boxPositionY + boxHeight
    })

    const targetWorldMinX = minWorldX - paddingX
    const targetWorldMaxX = maxWorldX + paddingX
    const targetWorldMinY = minWorldY - paddingY
    const targetWorldMaxY = maxWorldY + paddingY

    const targetWorldWidth = Math.max(100, targetWorldMaxX - targetWorldMinX)
    const targetWorldHeight = Math.max(100, targetWorldMaxY - targetWorldMinY)

    const containerBoundingRect = this.host.getBoundingClientRect()
    const screenWidth = Math.max(100, containerBoundingRect.width || this.host.clientWidth || 800)
    const screenHeight = Math.max(100, containerBoundingRect.height || this.host.clientHeight || 600)

    const scaleFactorX = screenWidth / targetWorldWidth
    const scaleFactorY = screenHeight / targetWorldHeight
    const targetZoomScale = Math.max(
      this.transformSystem.minZoom,
      Math.min(this.transformSystem.maxZoom, Math.min(scaleFactorX, scaleFactorY)),
    )

    const centerWorldX = (targetWorldMinX + targetWorldMaxX) / 2
    const centerWorldY = (targetWorldMinY + targetWorldMaxY) / 2

    this.transformSystem.k = targetZoomScale
    this.transformSystem.x = screenWidth / 2 - centerWorldX * targetZoomScale
    this.transformSystem.y = screenHeight / 2 - centerWorldY * targetZoomScale

    this.updateView()
  }

  /**
   * Alias for autoZoom to fit all nodes inside the viewport.
   */
  zoomToFit(boxes: AxonBoxType[], columnWidth = 300, paddingColumns = 1): void {
    this.autoZoom(boxes, columnWidth, paddingColumns)
  }
}
