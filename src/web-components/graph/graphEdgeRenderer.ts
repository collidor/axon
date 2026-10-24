import type { AxonEdgeType, AxonPortBaseType, Point } from '../constants'
import { BOX_SELECTOR } from '../constants'
import { escapePortId, isAxonPort } from '../helpers'
import {
  computeBezierPath,
  isEdgeInViewport,
  createEdgeSvgGroup,
  createGhostPath,
} from '../svgRenderer'

export interface EdgeMetadata {
  fromPort: AxonPortBaseType | null
  toPort: AxonPortBaseType | null
  lastPath: string
  isVisible: boolean
  hitLine: SVGPathElement | null
  mainLine: SVGPathElement | null
  wasAnimated: boolean
}

export interface EdgeRendererHost {
  svg: SVGSVGElement
  queryScoped<T extends Element>(selector: string): T | null
  getPortCenter(port: AxonPortBaseType, bufferPoint?: Point): Point
}

/**
 * High-performance SVG edge renderer with bezier curve calculation,
 * viewport culling, pulse wave animations, and DOM pooling.
 */
export class GraphEdgeRenderer {
  private readonly host: EdgeRendererHost
  public readonly edgeMap = new Map<AxonEdgeType, SVGGElement>()
  public readonly edgeMetadata = new Map<AxonEdgeType, EdgeMetadata>()

  private readonly pointBufferA: Point = { x: 0, y: 0 }
  private readonly pointBufferB: Point = { x: 0, y: 0 }

  constructor(host: EdgeRendererHost) {
    this.host = host
  }

  /**
   * Resets edge tracking maps and removes all child SVG elements.
   */
  clear(): void {
    this.edgeMap.forEach((g) => g.remove())
    this.edgeMap.clear()
    this.edgeMetadata.clear()
  }

  /**
   * Renders all visible graph edges and optional connection ghost line.
   */
  renderEdges(
    edges: AxonEdgeType[],
    edgeIds: Set<AxonEdgeType>,
    visibleViewportBounds: { left: number; top: number; right: number; bottom: number },
    simulationTime: number,
    connectingState: {
      isConnecting: boolean
      ghostPos: Point | null
      connStartPort: AxonPortBaseType | null
    },
  ): number {
    if (!this.host.svg) return 0

    // Remove deleted edges from SVG pool
    for (const [edgeElement, groupElement] of this.edgeMap) {
      if (!edgeIds.has(edgeElement)) {
        groupElement.remove()
        this.edgeMap.delete(edgeElement)
        this.edgeMetadata.delete(edgeElement)
      }
    }

    let activeAnimationCount = 0

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i] as AxonEdgeType
      let meta = this.edgeMetadata.get(edge)
      if (!meta) {
        meta = {
          fromPort: null,
          toPort: null,
          lastPath: '',
          isVisible: true,
          hitLine: null,
          mainLine: null,
          wasAnimated: false,
        }
        this.edgeMetadata.set(edge, meta)
      }

      // Lazily resolve connected ports if disconnected or not cached yet
      if (!meta.fromPort || !meta.fromPort.isConnected) {
        const fromPortId = edge.getAttribute('from')
        if (fromPortId) {
          meta.fromPort = this.host.queryScoped(
            '#' + escapePortId(fromPortId),
          ) as AxonPortBaseType
        }
      }
      if (!meta.toPort || !meta.toPort.isConnected) {
        const toPortId = edge.getAttribute('to')
        if (toPortId) {
          meta.toPort = this.host.queryScoped(
            '#' + escapePortId(toPortId),
          ) as AxonPortBaseType
        }
      }

      let edgeGroup = this.edgeMap.get(edge)

      if (
        !meta.fromPort ||
        !meta.toPort ||
        !meta.fromPort.isConnected ||
        !meta.toPort.isConnected
      ) {
        if (edgeGroup && meta.isVisible !== false) {
          edgeGroup.style.display = 'none'
          meta.isVisible = false
        }
        continue
      }

      const startCenter = this.host.getPortCenter(meta.fromPort, this.pointBufferA)
      const endCenter = this.host.getPortCenter(meta.toPort, this.pointBufferB)

      // Suppress lingering edges anchored at (0, 0) if either port is unmeasured/unconnected
      if ((startCenter.x === 0 && startCenter.y === 0) || (endCenter.x === 0 && endCenter.y === 0)) {
        const fromBox = meta.fromPort.closest(BOX_SELECTOR) as HTMLElement | null
        const toBox = meta.toPort.closest(BOX_SELECTOR) as HTMLElement | null
        const fromBoxX = (fromBox as any)?.x ?? parseFloat(fromBox?.style?.left || '0')
        const fromBoxY = (fromBox as any)?.y ?? parseFloat(fromBox?.style?.top || '0')
        const toBoxX = (toBox as any)?.x ?? parseFloat(toBox?.style?.left || '0')
        const toBoxY = (toBox as any)?.y ?? parseFloat(toBox?.style?.top || '0')

        if (
          (startCenter.x === 0 && startCenter.y === 0 && (fromBoxX !== 0 || fromBoxY !== 0 || !fromBox)) ||
          (endCenter.x === 0 && endCenter.y === 0 && (toBoxX !== 0 || toBoxY !== 0 || !toBox))
        ) {
          if (edgeGroup && meta.isVisible !== false) {
            edgeGroup.style.display = 'none'
            meta.isVisible = false
          }
          continue
        }
      }

      const { pathData, dx } = computeBezierPath(startCenter, endCenter)
      const isVisibleInViewport = isEdgeInViewport(
        startCenter,
        endCenter,
        dx,
        visibleViewportBounds,
      )

      if (!isVisibleInViewport) {
        if (edgeGroup && meta.isVisible !== false) {
          edgeGroup.style.display = 'none'
          meta.isVisible = false
        }
        continue
      }

      if (meta.isVisible === false && edgeGroup) {
        edgeGroup.style.display = ''
        meta.isVisible = true
      }

      if (!edgeGroup) {
        edgeGroup = createEdgeSvgGroup(() => edge.remove())
        this.host.svg.appendChild(edgeGroup)
        this.edgeMap.set(edge, edgeGroup)
        meta.isVisible = true
        meta.hitLine = edgeGroup.children.item(0) as SVGPathElement
        meta.mainLine = edgeGroup.children.item(1) as SVGPathElement
      }

      if (meta.lastPath !== pathData) {
        meta.hitLine!.setAttribute('d', pathData)
        meta.mainLine!.setAttribute('d', pathData)
        meta.lastPath = pathData
      }

      const pulseIntensity = edge.pulseIntensity || 0
      if (pulseIntensity > 0) {
        activeAnimationCount++
        const shimmerPhase = 0.85 + 0.15 * Math.sin(simulationTime / 15)
        const alpha = Math.min(1, 0.4 + pulseIntensity * 0.6 * shimmerPhase)

        const explicitColor =
          edge.getAttribute('pulse-color') ||
          edge.getAttribute('color') ||
          edge.style.getPropertyValue('--pulse-color')

        let pulseColor = explicitColor
        if (!pulseColor) {
          const fromType =
            meta.fromPort?.getAttribute('data-type') || (meta.fromPort as any)?.dataType || 'any'
          pulseColor = `var(--ui-port-${fromType}, var(--ndd-edge-pulse-color, var(--ui-color-accent, #38bdf8)))`
        }

        meta.mainLine!.style.stroke = pulseColor
        meta.mainLine!.style.opacity = `${alpha}`
        meta.mainLine!.style.strokeWidth = `${2 + pulseIntensity * 4}px`
        meta.mainLine!.style.filter = `drop-shadow(0 0 ${4 + pulseIntensity * 6}px ${pulseColor})`
        meta.wasAnimated = true
      } else if (meta.wasAnimated) {
        meta.mainLine!.style.stroke = ''
        meta.mainLine!.style.opacity = ''
        meta.mainLine!.style.strokeWidth = ''
        meta.mainLine!.style.filter = ''
        meta.wasAnimated = false
      }
    }

    // Render ghost cable when dragging new connection
    let ghostPath = this.host.svg.querySelector('.ghost') as SVGPathElement | null
    if (connectingState.isConnecting && connectingState.ghostPos && connectingState.connStartPort) {
      if (!ghostPath) {
        ghostPath = createGhostPath()
        this.host.svg.appendChild(ghostPath)
      }

      const startCenter = this.host.getPortCenter(connectingState.connStartPort, this.pointBufferA)
      const isStartInput = isAxonPort(connectingState.connStartPort, 'in')
      const sourcePoint = isStartInput ? connectingState.ghostPos : startCenter
      const targetPoint = isStartInput ? startCenter : connectingState.ghostPos

      const { pathData } = computeBezierPath(sourcePoint, targetPoint)
      ghostPath.setAttribute('d', pathData)
    } else if (ghostPath) {
      ghostPath.remove()
    }

    return activeAnimationCount
  }
}
