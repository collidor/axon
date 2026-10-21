import type { Point, AxonPortBaseType } from '../constants.js'
import { TAG_NAMES } from '../constants.js'
import { isAxonPort } from '../helpers.js'
import type { BaseGraph } from '../../core/base.graph.js'
import type { SerializedEdge } from '../../core/serialization.js'
import { AddEdgeCommand, RemoveEdgeCommand } from '../../commands/graphCommands.js'
import type { ViewportTransformSystem } from '../../systems/viewportTransform.system.js'

export interface GraphConnectionHost {
  classList: DOMTokenList
  svg: SVGSVGElement
  viewportTransform: ViewportTransformSystem
  engine: BaseGraph
  dispatchEvent(event: Event): boolean
  requestDraw(): void
  executeCommand(command: any, inverseCommand?: any, description?: string): void
  getPortCenter(port: AxonPortBaseType, bufferPoint?: Point): Point
  findPortAtPoint(
    clientX: number,
    clientY: number,
    radius: number,
    filterFn?: (port: AxonPortBaseType) => boolean,
  ): AxonPortBaseType | null
  queryScoped<T extends Element>(selector: string): T | null
  queryScopedAll<T extends Element>(selector: string): T[]
}

/**
 * Controller managing interactive port drag-and-drop connections, magnetic snapping,
 * candidate port validation highlighting, and single-input disconnection semantics.
 */
export class GraphConnectionController {
  private readonly host: GraphConnectionHost
  public isConnecting = false
  public connStartPort: AxonPortBaseType | null = null
  public hoveredPort: AxonPortBaseType | null = null
  public ghostPos: Point | null = null

  private readonly pointBufferA: Point = { x: 0, y: 0 }
  private readonly pointBufferB: Point = { x: 0, y: 0 }

  constructor(host: GraphConnectionHost) {
    this.host = host
  }

  /**
   * Initiates a connection drag from a starting port, evaluating and highlighting
   * candidate target ports throughout the graph.
   */
  startConnection(startPort: AxonPortBaseType): void {
    this.isConnecting = true
    this.host.classList.add('is-connecting')
    this.connStartPort = startPort
    const portCenter = this.host.getPortCenter(startPort, this.pointBufferA)
    this.ghostPos = { ...portCenter }

    const isStartingFromInput = isAxonPort(startPort, 'in')
    const startNodeId = (startPort as any)?.box?.id
    const startPortId = (startPort as any)?.id || ''

    // Highlight all opposite-polarity ports in other nodes with validity badges
    this.host
      .queryScopedAll<AxonPortBaseType>(
        isStartingFromInput ? TAG_NAMES.AXON_PORT_OUT : TAG_NAMES.AXON_PORT_IN,
      )
      .forEach((candidatePort) => {
        const targetPortId = (candidatePort as any)?.id || ''
        if (targetPortId === startPortId || (startNodeId && (candidatePort as any)?.box?.id === startNodeId)) {
          return
        }
        const sourceId = isStartingFromInput ? targetPortId : startPortId
        const destinationId = isStartingFromInput ? startPortId : targetPortId
        const isConnectionPermitted = this.host.engine.canConnectPorts(sourceId, destinationId).valid
        if (isConnectionPermitted) {
          candidatePort.classList.add('valid-target')
        } else {
          candidatePort.classList.add('invalid-target')
        }
      })

    this.host.requestDraw()
  }

  /**
   * Tracks pointer movement during an active connection drag, providing magnetic snapping
   * when nearing a compatible candidate port.
   */
  moveConnection(pointerEvent: PointerEvent): void {
    if (!this.isConnecting || !this.connStartPort) return

    const hostBoundingRect = (this.host as any).getBoundingClientRect()
    const mouseWorldCoordinate = this.host.viewportTransform.toWorld(
      pointerEvent.clientX - hostBoundingRect.left,
      pointerEvent.clientY - hostBoundingRect.top,
    )

    const isStartInput = isAxonPort(this.connStartPort, 'in')
    const candidateFilter = (candidatePort: AxonPortBaseType) => {
      if (!this.connStartPort || candidatePort === this.connStartPort) return false
      const isTargetInput = isAxonPort(candidatePort, 'in')
      return isStartInput !== isTargetInput
    }

    let targetCandidatePort =
      typeof document.elementFromPoint === 'function'
        ? (document
            .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
            ?.closest(`${TAG_NAMES.AXON_PORT_IN}, ${TAG_NAMES.AXON_PORT_OUT}`) as AxonPortBaseType | null)
        : null

    if (!targetCandidatePort || targetCandidatePort === this.connStartPort) {
      targetCandidatePort = this.host.findPortAtPoint(
        pointerEvent.clientX,
        pointerEvent.clientY,
        28,
        candidateFilter,
      )
    }

    if (targetCandidatePort && targetCandidatePort !== this.connStartPort) {
      const sourcePortId = isStartInput ? targetCandidatePort.id : this.connStartPort.id
      const destinationPortId = isStartInput ? this.connStartPort.id : targetCandidatePort.id
      const compatibilityCheck = this.host.engine.canConnectPorts(sourcePortId, destinationPortId)

      if (compatibilityCheck.valid) {
        if (this.hoveredPort && this.hoveredPort !== targetCandidatePort) {
          this.hoveredPort.classList.remove('valid-target-hover')
        }
        this.hoveredPort = targetCandidatePort
        targetCandidatePort.classList.add('valid-target-hover')

        // Magnetic snap to the target port center
        const targetCenterPoint = this.host.getPortCenter(targetCandidatePort, this.pointBufferB)
        this.ghostPos = { x: targetCenterPoint.x, y: targetCenterPoint.y }
      } else {
        if (this.hoveredPort) {
          this.hoveredPort.classList.remove('valid-target-hover')
          this.hoveredPort = null
        }
        this.ghostPos = mouseWorldCoordinate
      }
    } else {
      if (this.hoveredPort) {
        this.hoveredPort.classList.remove('valid-target-hover')
        this.hoveredPort = null
      }
      this.ghostPos = mouseWorldCoordinate
    }

    this.host.requestDraw()
  }

  /**
   * Finalizes the connection drag, committing AddEdgeCommand if dropped over a valid port.
   */
  endConnection(pointerEvent: PointerEvent): void {
    if (!this.isConnecting) return

    // Magnetic fallback check if pointer was released slightly offset from port dot
    if (!this.hoveredPort && this.connStartPort) {
      const isStartInput = isAxonPort(this.connStartPort, 'in')
      const candidateFilter = (candidatePort: AxonPortBaseType) => {
        if (candidatePort === this.connStartPort) return false
        const isTargetInput = isAxonPort(candidatePort, 'in')
        return isStartInput !== isTargetInput
      }
      const nearbyPort = this.host.findPortAtPoint(
        pointerEvent.clientX,
        pointerEvent.clientY,
        28,
        candidateFilter,
      )
      if (nearbyPort) {
        const sourcePortId = isStartInput ? nearbyPort.id : this.connStartPort.id
        const destinationPortId = isStartInput ? this.connStartPort.id : nearbyPort.id
        if (this.host.engine.canConnectPorts(sourcePortId, destinationPortId).valid) {
          this.hoveredPort = nearbyPort
        }
      }
    }

    if (this.connStartPort && this.hoveredPort) {
      const sourcePortId = isAxonPort(this.connStartPort, 'out')
        ? this.connStartPort.id
        : this.hoveredPort.id
      const destinationPortId = isAxonPort(this.connStartPort, 'in')
        ? this.connStartPort.id
        : this.hoveredPort.id

      if (sourcePortId && destinationPortId && sourcePortId !== destinationPortId) {
        const validationResult = this.host.engine.canConnectPorts(sourcePortId, destinationPortId)
        if (validationResult.valid) {
          const edgeDefinition: SerializedEdge = { from: sourcePortId, to: destinationPortId }
          const existingEdgeElement = this.host.queryScoped(
            `${TAG_NAMES.AXON_EDGE}[to="${destinationPortId}"]`,
          )
          const displacedSourcePortId = existingEdgeElement?.getAttribute('from')

          if (displacedSourcePortId && displacedSourcePortId !== sourcePortId) {
            // Strict single-input rule: displace previous incoming connection
            const displacedEdge: SerializedEdge = {
              from: displacedSourcePortId,
              to: destinationPortId,
            }
            const forwardCommand = new AddEdgeCommand({ edge: edgeDefinition, displacedEdge })
            const inverseCommand = new AddEdgeCommand({
              edge: displacedEdge,
              displacedEdge: edgeDefinition,
            })
            this.host.executeCommand(
              forwardCommand,
              inverseCommand,
              `Connect ${sourcePortId} -> ${destinationPortId}`,
            )
          } else {
            const forwardCommand = new AddEdgeCommand({ edge: edgeDefinition })
            const inverseCommand = new RemoveEdgeCommand({ edge: edgeDefinition })
            this.host.executeCommand(
              forwardCommand,
              inverseCommand,
              `Connect ${sourcePortId} -> ${destinationPortId}`,
            )
          }
        } else {
          this.host.dispatchEvent(
            new CustomEvent('axon-connection-rejected', {
              bubbles: true,
              composed: true,
              detail: {
                from: sourcePortId,
                to: destinationPortId,
                reason: validationResult.reason,
              },
            }),
          )
        }
      }
    }

    this.cancelConnection()
  }

  /**
   * Resets connection state and cleans up visual target indicator classes.
   */
  cancelConnection(): void {
    this.isConnecting = false
    this.host.classList.remove('is-connecting')
    this.connStartPort = null
    this.ghostPos = null
    if (this.hoveredPort) {
      this.hoveredPort.classList.remove('valid-target-hover')
      this.hoveredPort = null
    }

    this.host
      .queryScopedAll<AxonPortBaseType>(`${TAG_NAMES.AXON_PORT_IN}, ${TAG_NAMES.AXON_PORT_OUT}`)
      .forEach((portElement) => {
        portElement.classList.remove('valid-target')
        portElement.classList.remove('invalid-target')
      })

    this.host.svg.querySelector('.ghost')?.remove()
    this.host.requestDraw()
  }
}
