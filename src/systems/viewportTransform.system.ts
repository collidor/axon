import type { Point } from '../core/constants'

export class ViewportTransformSystem {
  public k = 1
  public x = 0
  public y = 0

  public minZoom = 0.1
  public maxZoom = 10

  constructor(
    initOptions?: Partial<Pick<ViewportTransformSystem, 'k' | 'x' | 'y' | 'minZoom' | 'maxZoom'>>,
  ) {
    this.load(initOptions)
  }

  public load(
    initOptions?: Partial<Pick<ViewportTransformSystem, 'k' | 'x' | 'y' | 'minZoom' | 'maxZoom'>>,
  ): void {
    if (!initOptions) {
      return
    }
    for (const key in this) {
      if (
        key in initOptions &&
        initOptions[
          key as keyof Pick<ViewportTransformSystem, 'k' | 'x' | 'y' | 'minZoom' | 'maxZoom'>
        ] !== undefined
      ) {
        this[key] = initOptions[
          key as keyof Pick<ViewportTransformSystem, 'k' | 'x' | 'y' | 'minZoom' | 'maxZoom'>
          // oxlint-disable-next-line typescript/no-explicit-any
        ] as any
      }
    }
  }

  public toWorld(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.x) / this.k,
      y: (screenY - this.y) / this.k,
    }
  }

  public toScreen(worldX: number, worldY: number): Point {
    return {
      x: worldX * this.k + this.x,
      y: worldY * this.k + this.y,
    }
  }

  public zoomAt(screenX: number, screenY: number, zoomFactor: number): void {
    const worldPosBeforeZoom = this.toWorld(screenX, screenY)
    const nextK = Math.max(this.minZoom, Math.min(this.maxZoom, this.k * zoomFactor))

    this.k = nextK
    this.x = screenX - worldPosBeforeZoom.x * this.k
    this.y = screenY - worldPosBeforeZoom.y * this.k
  }

  public pan(deltaX: number, deltaY: number): void {
    this.x += deltaX
    this.y += deltaY
  }

  public serialize() {
    return {
      x: this.x,
      y: this.y,
      k: this.k,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
    }
  }

  public getVisibleWorldBounds(
    width: number,
    height: number,
  ): { left: number; top: number; right: number; bottom: number } {
    const topLeft = this.toWorld(0, 0)
    const bottomRight = this.toWorld(width, height)

    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
    }
  }
}
