import { nodeRegistry, type AxonNodeRegistry } from '../../core/nodeRegistry'
import { NODE_TYPES } from '../../nodes/nodes.constants'
import { AUDIO_NODE_TYPES } from '../../nodes/audio/audioNodes.constants'
import { registerCoreNodes } from '../../nodes/nodeLibrary'
import { TAG_NAMES } from '../constants'

import { createClockNode } from '../../nodes/clock.node'
import { createMathNode } from '../../nodes/math.node'
import { createDisplayNode } from '../../nodes/display.node'
import {
  createGroupInputNode,
  createGroupOutputNode,
  createSubgraphNode,
} from '../../nodes/subgraph.node'
import { createConstantNode } from '../../nodes/constant.node'
import { createEventNode } from '../../nodes/event.node'
import { createCommandDispatchNode } from '../../nodes/commandDispatch.node'
import { createSqliteTableNode } from '../../nodes/sqliteTable.node'
import { createUmlTableNode } from '../../nodes/umlTable.node'
import {
  createChangePageNode,
} from '../../nodes/routing/router.engine'
import {
  createTableQueryNode,
  createTableJoinNode,
  createRouteParamNode,
  createQueryParamNode,
  createQueryParamsNode,
  createRouteInfoNode,
  createUrlLocationNode,
  createArrayTransformNode,
  createObjectTransformNode,
  createRouteScopeNode,
  createPageRouterDataNode,
  createComponentOutputNode,
  createTableComponentNode,
} from '../../nodes/data/dataGraph.engine'
import { createGateNode } from '../../nodes/gate.node'
import { createLogicNode } from '../../nodes/logic.node'
import { createCompareNode } from '../../nodes/compare.node'
import { createDbPutNode } from '../../nodes/dbPut.node'
import { createTypeConvertNode } from '../../nodes/typeConvert.node'
import { createResourceNode } from '../../nodes/resource.node'
import {
  createInvalidateResourceNode,
  createRefetchResourceNode,
} from '../../nodes/actions/resourceAction.engine'
import { createAudioClockNode } from '../../nodes/audio/clock.engine'
import { createSequenceNode } from '../../nodes/audio/sequence.engine'
import { createParallelNode } from '../../nodes/audio/parallel.engine'
import { createStepSequencerNode } from '../../nodes/audio/stepSequencer.engine'
import { createEuclideanNode } from '../../nodes/audio/euclidean.engine'
import { createScaleQuantizerNode } from '../../nodes/audio/scaleQuantizer.engine'
import { createChordNode } from '../../nodes/audio/chord.engine'
import { createArpeggiatorNode } from '../../nodes/audio/arpeggiator.engine'
import { createPolySynthNode } from '../../nodes/audio/polySynth.engine'
import { createDrumSamplerNode } from '../../nodes/audio/drumSampler.engine'
import { createAudioDelayNode } from '../../nodes/audio/fx/delay.engine'
import { createReverbNode } from '../../nodes/audio/fx/reverb.engine'
import { createBitcrusherNode } from '../../nodes/audio/fx/bitcrusher.engine'
import { createMasterOutputNode } from '../../nodes/audio/fx/masterOutput.engine'
import { createAudioMixerNode } from '../../nodes/audio/fx/audioMixer.engine'

/**
 * Registers Web Component node elements with custom element tag names.
 * Used in browser / UI environments where custom elements render visual cards.
 */
export function registerWebComponentNodes(registry: AxonNodeRegistry = nodeRegistry) {
  registerCoreNodes(registry)

  registry.register(NODE_TYPES.CLOCK, {
    type: NODE_TYPES.CLOCK,
    component: TAG_NAMES.AXON_CLOCK_NODE,
    createEngine: createClockNode,
  })

  registry.register(NODE_TYPES.MATH, {
    type: NODE_TYPES.MATH,
    component: TAG_NAMES.AXON_MATH_NODE,
    createEngine: createMathNode,
  })

  registry.register(NODE_TYPES.DISPLAY, {
    type: NODE_TYPES.DISPLAY,
    component: TAG_NAMES.AXON_DISPLAY_NODE,
    createEngine: createDisplayNode,
  })

  registry.register(NODE_TYPES.SUBGRAPH, {
    type: NODE_TYPES.SUBGRAPH,
    component: TAG_NAMES.AXON_SUBGRAPH_NODE,
    createEngine: createSubgraphNode,
  })

  registry.register(NODE_TYPES.GROUP_INPUT, {
    type: NODE_TYPES.GROUP_INPUT,
    component: TAG_NAMES.AXON_GROUP_INPUT_NODE,
    createEngine: createGroupInputNode,
  })

  registry.register(NODE_TYPES.GROUP_OUTPUT, {
    type: NODE_TYPES.GROUP_OUTPUT,
    component: TAG_NAMES.AXON_GROUP_OUTPUT_NODE,
    createEngine: createGroupOutputNode,
  })

  registry.register(NODE_TYPES.CONSTANT, {
    type: NODE_TYPES.CONSTANT,
    component: TAG_NAMES.AXON_CONSTANT_NODE,
    createEngine: createConstantNode,
  })

  registry.register(NODE_TYPES.UML_TABLE, {
    type: NODE_TYPES.UML_TABLE,
    component: TAG_NAMES.AXON_UML_TABLE_NODE,
    createEngine: createUmlTableNode,
  })

  registry.register(NODE_TYPES.TABLE_QUERY, {
    type: NODE_TYPES.TABLE_QUERY,
    component: TAG_NAMES.AXON_TABLE_QUERY_NODE,
    createEngine: createTableQueryNode,
  })

  registry.register(NODE_TYPES.TABLE_JOIN, {
    type: NODE_TYPES.TABLE_JOIN,
    component: TAG_NAMES.AXON_TABLE_JOIN_NODE,
    createEngine: createTableJoinNode,
  })

  registry.register(NODE_TYPES.ROUTE_PARAM, {
    type: NODE_TYPES.ROUTE_PARAM,
    component: TAG_NAMES.AXON_ROUTE_PARAM_NODE,
    createEngine: createRouteParamNode,
  })

  registry.register(NODE_TYPES.QUERY_PARAM, {
    type: NODE_TYPES.QUERY_PARAM,
    component: TAG_NAMES.AXON_QUERY_PARAM_NODE,
    createEngine: createQueryParamNode,
  })

  registry.register(NODE_TYPES.QUERY_PARAMS, {
    type: NODE_TYPES.QUERY_PARAMS,
    component: TAG_NAMES.AXON_QUERY_PARAMS_NODE,
    createEngine: createQueryParamsNode,
  })

  registry.register(NODE_TYPES.ROUTE_INFO, {
    type: NODE_TYPES.ROUTE_INFO,
    component: TAG_NAMES.AXON_ROUTE_INFO_NODE,
    createEngine: createRouteInfoNode,
  })

  registry.register(NODE_TYPES.URL_LOCATION, {
    type: NODE_TYPES.URL_LOCATION,
    component: TAG_NAMES.AXON_URL_LOCATION_NODE,
    createEngine: createUrlLocationNode,
  })

  registry.register(NODE_TYPES.ARRAY_TRANSFORM, {
    type: NODE_TYPES.ARRAY_TRANSFORM,
    component: TAG_NAMES.AXON_ARRAY_TRANSFORM_NODE,
    createEngine: createArrayTransformNode,
  })

  registry.register(NODE_TYPES.OBJECT_TRANSFORM, {
    type: NODE_TYPES.OBJECT_TRANSFORM,
    component: TAG_NAMES.AXON_OBJECT_TRANSFORM_NODE,
    createEngine: createObjectTransformNode,
  })

  registry.register(NODE_TYPES.ROUTE_SCOPE, {
    type: NODE_TYPES.ROUTE_SCOPE,
    component: TAG_NAMES.AXON_ROUTE_SCOPE_NODE,
    createEngine: createRouteScopeNode,
  })

  registry.register(NODE_TYPES.PAGE_ROUTER_DATA, {
    type: NODE_TYPES.PAGE_ROUTER_DATA,
    component: TAG_NAMES.AXON_PAGE_ROUTER_DATA_NODE,
    createEngine: createPageRouterDataNode,
  })

  registry.register(NODE_TYPES.COMPONENT_OUTPUT, {
    type: NODE_TYPES.COMPONENT_OUTPUT,
    component: TAG_NAMES.AXON_COMPONENT_OUTPUT_NODE,
    createEngine: createComponentOutputNode,
  })

  registry.register(NODE_TYPES.TABLE_COMPONENT, {
    type: NODE_TYPES.TABLE_COMPONENT,
    component: TAG_NAMES.AXON_TABLE_COMPONENT_NODE,
    createEngine: createTableComponentNode,
  })

  registry.register(NODE_TYPES.DB_PUT, {
    type: NODE_TYPES.DB_PUT,
    component: TAG_NAMES.AXON_DB_PUT_NODE,
    createEngine: createDbPutNode,
  })

  registry.register(NODE_TYPES.LOGIC, {
    type: NODE_TYPES.LOGIC,
    component: TAG_NAMES.AXON_LOGIC_NODE,
    createEngine: createLogicNode,
  })

  registry.register(NODE_TYPES.COMPARE, {
    type: NODE_TYPES.COMPARE,
    component: TAG_NAMES.AXON_COMPARE_NODE,
    createEngine: createCompareNode,
  })

  registry.register(NODE_TYPES.GATE, {
    type: NODE_TYPES.GATE,
    component: TAG_NAMES.AXON_GATE_NODE,
    createEngine: createGateNode,
  })

  registry.register(NODE_TYPES.TYPE_CONVERT, {
    type: NODE_TYPES.TYPE_CONVERT,
    component: TAG_NAMES.AXON_TYPE_CONVERT_NODE,
    createEngine: createTypeConvertNode,
  })

  registry.register(NODE_TYPES.COMMAND_DISPATCH, {
    type: NODE_TYPES.COMMAND_DISPATCH,
    component: TAG_NAMES.AXON_COMMAND_DISPATCH_NODE,
    createEngine: createCommandDispatchNode,
  })

  registry.register(NODE_TYPES.EVENT, {
    type: NODE_TYPES.EVENT,
    component: TAG_NAMES.AXON_EVENT_NODE,
    createEngine: createEventNode,
  })

  registry.register(NODE_TYPES.CHANGE_PAGE, {
    type: NODE_TYPES.CHANGE_PAGE,
    component: TAG_NAMES.AXON_CHANGE_PAGE_NODE,
    createEngine: createChangePageNode,
  })

  registry.register(NODE_TYPES.RESOURCE, {
    type: NODE_TYPES.RESOURCE,
    component: TAG_NAMES.AXON_RESOURCE_NODE,
    createEngine: createResourceNode,
  })

  registry.register(NODE_TYPES.INVALIDATE_RESOURCE, {
    type: NODE_TYPES.INVALIDATE_RESOURCE,
    component: TAG_NAMES.AXON_INVALIDATE_RESOURCE_NODE,
    createEngine: createInvalidateResourceNode,
  })

  registry.register(NODE_TYPES.REFETCH_RESOURCE, {
    type: NODE_TYPES.REFETCH_RESOURCE,
    component: TAG_NAMES.AXON_REFETCH_RESOURCE_NODE,
    createEngine: createRefetchResourceNode,
  })

  // Audio Web Component Nodes
  registry.register(AUDIO_NODE_TYPES.AUDIO_CLOCK, {
    type: AUDIO_NODE_TYPES.AUDIO_CLOCK,
    component: TAG_NAMES.AXON_AUDIO_CLOCK_NODE,
    createEngine: createAudioClockNode,
  })

  registry.register(AUDIO_NODE_TYPES.SEQUENCE, {
    type: AUDIO_NODE_TYPES.SEQUENCE,
    component: TAG_NAMES.AXON_SEQUENCE_NODE,
    createEngine: createSequenceNode,
  })

  registry.register(AUDIO_NODE_TYPES.PARALLEL, {
    type: AUDIO_NODE_TYPES.PARALLEL,
    component: TAG_NAMES.AXON_PARALLEL_NODE,
    createEngine: createParallelNode,
  })

  registry.register(AUDIO_NODE_TYPES.STEP_SEQUENCER, {
    type: AUDIO_NODE_TYPES.STEP_SEQUENCER,
    component: TAG_NAMES.AXON_STEP_SEQUENCER_NODE,
    createEngine: createStepSequencerNode,
  })

  registry.register(AUDIO_NODE_TYPES.EUCLIDEAN, {
    type: AUDIO_NODE_TYPES.EUCLIDEAN,
    component: TAG_NAMES.AXON_EUCLIDEAN_NODE,
    createEngine: createEuclideanNode,
  })

  registry.register(AUDIO_NODE_TYPES.SCALE_QUANTIZER, {
    type: AUDIO_NODE_TYPES.SCALE_QUANTIZER,
    component: TAG_NAMES.AXON_SCALE_QUANTIZER_NODE,
    createEngine: createScaleQuantizerNode,
  })

  registry.register(AUDIO_NODE_TYPES.CHORD, {
    type: AUDIO_NODE_TYPES.CHORD,
    component: TAG_NAMES.AXON_CHORD_NODE,
    createEngine: createChordNode,
  })

  registry.register(AUDIO_NODE_TYPES.ARPEGGIATOR, {
    type: AUDIO_NODE_TYPES.ARPEGGIATOR,
    component: TAG_NAMES.AXON_ARPEGGIATOR_NODE,
    createEngine: createArpeggiatorNode,
  })

  registry.register(AUDIO_NODE_TYPES.POLY_SYNTH, {
    type: AUDIO_NODE_TYPES.POLY_SYNTH,
    component: TAG_NAMES.AXON_SYNTH_NODE,
    createEngine: createPolySynthNode,
  })

  registry.register(AUDIO_NODE_TYPES.DRUM_SAMPLER, {
    type: AUDIO_NODE_TYPES.DRUM_SAMPLER,
    component: TAG_NAMES.AXON_DRUM_SAMPLER_NODE,
    createEngine: createDrumSamplerNode,
  })

  registry.register(AUDIO_NODE_TYPES.DELAY, {
    type: AUDIO_NODE_TYPES.DELAY,
    component: TAG_NAMES.AXON_DELAY_NODE,
    createEngine: createAudioDelayNode,
  })

  registry.register(AUDIO_NODE_TYPES.REVERB, {
    type: AUDIO_NODE_TYPES.REVERB,
    component: TAG_NAMES.AXON_REVERB_NODE,
    createEngine: createReverbNode,
  })

  registry.register(AUDIO_NODE_TYPES.BITCRUSHER, {
    type: AUDIO_NODE_TYPES.BITCRUSHER,
    component: TAG_NAMES.AXON_BITCRUSHER_NODE,
    createEngine: createBitcrusherNode,
  })

  registry.register(AUDIO_NODE_TYPES.MASTER_OUTPUT, {
    type: AUDIO_NODE_TYPES.MASTER_OUTPUT,
    component: TAG_NAMES.AXON_MASTER_OUTPUT_NODE,
    createEngine: createMasterOutputNode,
  })

  registry.register(AUDIO_NODE_TYPES.AUDIO_MIXER, {
    type: AUDIO_NODE_TYPES.AUDIO_MIXER,
    component: TAG_NAMES.AXON_AUDIO_MIXER_NODE,
    createEngine: createAudioMixerNode,
  })

  registry.register(AUDIO_NODE_TYPES.AUDIO_COMBINER, {
    type: AUDIO_NODE_TYPES.AUDIO_COMBINER,
    component: TAG_NAMES.AXON_AUDIO_MIXER_NODE,
    createEngine: createAudioMixerNode,
  })
}

/**
 * Default UI node registration: registers generic Web Component nodes.
 */
export async function registerUiNodes(registry: AxonNodeRegistry = nodeRegistry) {
  registerWebComponentNodes(registry)
}
