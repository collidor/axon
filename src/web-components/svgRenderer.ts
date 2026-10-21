import type { Point } from '../core/constants'

export interface ViewportBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export function computeBezierPath(start: Point, end: Point): { pathData: string; dx: number } {
  const dx = Math.max(40, Math.abs(end.x - start.x) * 0.5)
  const pathData = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`
  return { pathData, dx }
}

export function isEdgeInViewport(
  start: Point,
  end: Point,
  dx: number,
  viewport: ViewportBounds,
  margin = 150,
): boolean {
  const edgeMinX = Math.min(start.x, end.x, start.x + dx, end.x - dx)
  const edgeMaxX = Math.max(start.x, end.x, start.x + dx, end.x - dx)
  const edgeMinY = Math.min(start.y, end.y)
  const edgeMaxY = Math.max(start.y, end.y)

  return !(
    edgeMaxX < viewport.left - margin ||
    edgeMinX > viewport.right + margin ||
    edgeMaxY < viewport.top - margin ||
    edgeMinY > viewport.bottom + margin
  )
}

export function createEdgeSvgGroup(onDelete?: () => void): SVGGElement {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  g.innerHTML = `
    <path class="hit-edge-line" style="stroke:transparent;stroke-width:16px;cursor:pointer;pointer-events:stroke" d="" />
    <path class="main-edge-line" stroke="var(--ndd-edge-color, #5b7b88)" stroke-width="2.5" stroke-linecap="round" fill="none" d="" />
  `
  if (onDelete) {
    g.onclick = onDelete
  }
  return g
}

export function createGhostPath(): SVGPathElement {
  const gp = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  gp.setAttribute('class', 'ghost')
  gp.setAttribute('fill', 'none')
  gp.setAttribute('stroke', 'var(--ndd-edge-ghost-color, #b89052)')
  gp.setAttribute('stroke-width', '2.5')
  gp.setAttribute('stroke-linecap', 'round')
  return gp
}
