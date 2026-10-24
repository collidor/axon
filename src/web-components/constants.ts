export const AXON_PORT = Symbol('AXON_PORT')
export const AXON_EDGE = Symbol('AXON_EDGE')
export const AXON_BOX = Symbol('AXON_BOX')
export const AXON_GRAPH = Symbol('AXON_GRAPH')

export const TAG_NAMES = {
  AXON_PORT_IN: 'axon-port-in',
  AXON_PORT_OUT: 'axon-port-out',
  AXON_EDGE: 'axon-edge',
  AXON_BOX: 'axon-box',
  AXON_GRAPH: 'axon-graph',
  AXON_MATH_NODE: 'axon-math-node',
  AXON_CONSTANT_NODE: 'axon-constant-node',
  AXON_DISPLAY_NODE: 'axon-display-node',
  AXON_CLOCK_NODE: 'axon-clock-node',
  AXON_SUBGRAPH_NODE: 'axon-subgraph-node',
  AXON_GROUP_INPUT_NODE: 'axon-group-input-node',
  AXON_GROUP_OUTPUT_NODE: 'axon-group-output-node',
  AXON_UML_TABLE_NODE: 'axon-uml-table-node',
  AXON_TABLE_QUERY_NODE: 'axon-table-query-node',
  AXON_TABLE_JOIN_NODE: 'axon-table-join-node',
  AXON_ROUTE_PARAM_NODE: 'axon-route-param-node',
  AXON_QUERY_PARAM_NODE: 'axon-query-param-node',
  AXON_QUERY_PARAMS_NODE: 'axon-query-params-node',
  AXON_ROUTE_INFO_NODE: 'axon-route-info-node',
  AXON_URL_LOCATION_NODE: 'axon-url-location-node',
  AXON_ARRAY_TRANSFORM_NODE: 'axon-array-transform-node',
  AXON_OBJECT_TRANSFORM_NODE: 'axon-object-transform-node',
  AXON_ROUTE_SCOPE_NODE: 'axon-route-scope-node',
  AXON_PAGE_ROUTER_DATA_NODE: 'axon-page-router-data-node',
  AXON_COMPONENT_OUTPUT_NODE: 'axon-component-output-node',
  AXON_TABLE_COMPONENT_NODE: 'axon-table-component-node',
  AXON_DB_PUT_NODE: 'axon-db-put-node',
  AXON_LOGIC_NODE: 'axon-logic-node',
  AXON_COMPARE_NODE: 'axon-compare-node',
  AXON_GATE_NODE: 'axon-gate-node',
  AXON_TYPE_CONVERT_NODE: 'axon-type-convert-node',
  AXON_COMMAND_DISPATCH_NODE: 'axon-command-dispatch-node',
  AXON_EVENT_NODE: 'axon-event-node',
  AXON_CHANGE_PAGE_NODE: 'axon-change-page-node',
  AXON_RESOURCE_NODE: 'axon-resource-node',
  AXON_INVALIDATE_RESOURCE_NODE: 'axon-invalidate-resource-node',
  AXON_REFETCH_RESOURCE_NODE: 'axon-refetch-resource-node',
  AXON_FEEDBACK_NODE: 'axon-feedback-node',
  AXON_AUDIO_CLOCK_NODE: 'axon-audio-clock-node',
  AXON_SEQUENCE_NODE: 'axon-sequence-node',
  AXON_PARALLEL_NODE: 'axon-parallel-node',
  AXON_STEP_SEQUENCER_NODE: 'axon-step-sequencer-node',
  AXON_SYNTH_NODE: 'axon-synth-node',
  AXON_DRUM_SAMPLER_NODE: 'axon-drum-sampler-node',
  AXON_DELAY_NODE: 'axon-delay-node',
  AXON_REVERB_NODE: 'axon-reverb-node',
  AXON_BITCRUSHER_NODE: 'axon-bitcrusher-node',
  AXON_MASTER_OUTPUT_NODE: 'axon-master-output-node',
  AXON_AUDIO_MIXER_NODE: 'axon-audio-mixer-node',
  AXON_EUCLIDEAN_NODE: 'axon-euclidean-node',
  AXON_SCALE_QUANTIZER_NODE: 'axon-scale-quantizer-node',
  AXON_CHORD_NODE: 'axon-chord-node',
  AXON_ARPEGGIATOR_NODE: 'axon-arpeggiator-node',
  AXON_STUDIO: 'axon-studio',
} as const

export const BOX_SELECTOR =
  'axon-box, [data-axon-node], .graph-node-box, .unified-node-card, [data-node-id], axon-math-node, axon-constant-node, axon-display-node, axon-clock-node, axon-subgraph-node, axon-group-input-node, axon-group-output-node, axon-uml-table-node, axon-table-query-node, axon-table-join-node, axon-route-param-node, axon-query-param-node, axon-query-params-node, axon-route-info-node, axon-url-location-node, axon-array-transform-node, axon-object-transform-node, axon-route-scope-node, axon-page-router-data-node, axon-component-output-node, axon-table-component-node, axon-db-put-node, axon-logic-node, axon-compare-node, axon-gate-node, axon-type-convert-node, axon-command-dispatch-node, axon-event-node, axon-change-page-node, axon-resource-node, axon-invalidate-resource-node, axon-refetch-resource-node, axon-feedback-node, axon-audio-clock-node, axon-sequence-node, axon-parallel-node, axon-step-sequencer-node, axon-synth-node, axon-drum-sampler-node, axon-delay-node, axon-reverb-node, axon-bitcrusher-node, axon-master-output-node, axon-audio-mixer-node, axon-euclidean-node, axon-scale-quantizer-node, axon-chord-node, axon-arpeggiator-node'

export const HEADER_SELECTOR =
  '.node-header, .axon-header, .card-header, .resource-header, .uml-table-header, .data-node-header, .table-query-header, .route-param-header, .array-transform-header, .object-transform-header, .route-scope-header, .component-output-header, .command-dispatch-header, .event-node-header, .change-page-header, .subgraph-header, .group-header, header, [data-node-header], [data-drag-handle], [class*="-header"], [class*="header"]'

export const classList = {
  selected: 'selected',
  dragging: 'dragging',
  validTarget: 'valid-target',
  isInteracting: 'is-interacting',
} as const

export type { PortDataType, Point } from '../core/constants'

export type PortOffset = {
  dx: number
  dy: number
  width: number
  height: number
  /** @deprecated Use width instead */
  w?: number
  /** @deprecated Use height instead */
  h?: number
}

export type Offset = PortOffset

import type { CommandHistoryManager } from '@collidor/command'
import type { ViewportTransformSystem } from '../systems/viewportTransform.system'
import type { TickEngine } from '../systems/tickEngine.system'
import type { SelectionManager } from '../systems/selectionManager'
import type { BaseGraph } from '../core/base.graph'
import type { SerializedGraph, SerializedEdge } from '../core/serialization'
import type { Point } from '../core/constants'
import type { LayoutNode, LayoutEngine } from '../systems/magneticDAGEngine.system'

export type AxonGraphType = HTMLElement & {
  [AXON_GRAPH]: true

  edges: AxonEdgeType[]
  dragMode: 'pan' | 'box-select'
  selectionManager: SelectionManager
  historyManager: CommandHistoryManager | null
  engine: BaseGraph
  getEngine(): BaseGraph
  setEngine(engine: BaseGraph): void

  layoutEngine: LayoutEngine | null
  autoSort: boolean
  columnWidth: number
  syncEngineLayout(isInitial?: boolean): void
  viewportTransform: ViewportTransformSystem
  tickEngine: TickEngine
  updateView(): void
  requestDraw(): void
  handleConnectionStart(port: AxonPortBaseType): void

  getPortValue(id: string): unknown
  rebuildAdjacency(): void
  setPortValue(id: string, value: unknown): void
  updateState(): void
  getPortCenter(port: AxonPortBaseType, out: Point): Point
  registerPort(nodeId: string, portId: string, direction?: 'in' | 'out'): void
  isPortConnected(portId: string): boolean

  addNode(node: unknown): void
  removeNode(nodeId: string): void
  deleteNode(nodeId: string, undoable?: boolean): boolean
  serialize(): SerializedGraph
  loadEdges(edges: SerializedEdge[]): void
  load(data: SerializedGraph, zoom?: number): void
  autoZoom(paddingColumns?: number): void
  zoomToFit(paddingColumns?: number): void
}

export type AxonPortBaseType = HTMLElement & {
  [AXON_PORT]: true
  box: AxonBoxType
  onConnected(): void
  onDisconnected(): void
  onValueUpdate?(value: unknown): void
  setValue?(value: unknown): void
}

export type AxonPortInType = AxonPortBaseType & {
  onValueUpdate(value: unknown): void
}
export type AxonPortOutType = AxonPortBaseType & {
  setValue(value: unknown): void
}

export type AxonEdgeType = HTMLElement & {
  [AXON_EDGE]: true
  pulseIntensity?: number
  pulseCleanup?: (() => void) | null
}

export type AxonBoxType = HTMLElement & {
  [AXON_BOX]: true
  readonly x: number
  readonly y: number
  moveTo(x?: number, y?: number): void
  lastRenderedValue: unknown
  axonNodeType: string
  // oxlint-disable-next-line typescript/no-explicit-any
  nodeData: any
} & LayoutNode

export type { LayoutNode, LayoutEngine } from '../systems/magneticDAGEngine.system'
