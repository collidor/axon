import { createClockNode } from './clock.node'
import { createMathNode } from './math.node'
import { createDisplayNode } from './display.node'
import {
  createGroupInputNode,
  createGroupOutputNode,
  createSubgraphNode,
} from './subgraph.node'
import { createConstantNode } from './constant.node'
import { createEventNode } from './event.node'
import { createCommandHandlerNode } from './commandHandler.node'
import { createCommandDispatchNode } from './commandDispatch.node'
import { createComposeStructNode } from './composeStruct.node'
import { createExtractComponentNode } from './extractComponent.node'
import { createSqliteTableNode } from './sqliteTable.node'
import { createUmlTableNode } from './umlTable.node'
import {
  createRouteMatchNode,
  createRouteGuardNode,
  createRouteRenderNode,
  createNavigateNode,
  createNavigateRouteNode,
  createRoutePushNode,
  createRoutePopNode,
  createRouteRewriteNode,
  createChangePageNode,
  createSetQueryParamNode,
  createSetQueryParamsNode,
} from './routing/router.engine'
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
} from './data/dataGraph.engine'
import { createGateNode } from './gate.node'
import { createLogicNode } from './logic.node'
import { createCompareNode } from './compare.node'
import { createDbPutNode } from './dbPut.node'
import { createTypeConvertNode } from './typeConvert.node'
import { createFeedbackNode } from './feedback.node'
import { createResourceNode } from './resource.node'
import {
  createInvalidateResourceNode,
  createRefetchResourceNode,
} from './actions/resourceAction.engine'
import { createAudioClockNode } from './audio/clock.engine'
import { createSequenceNode } from './audio/sequence.engine'
import { createParallelNode } from './audio/parallel.engine'
import { createEuclideanNode } from './audio/euclidean.engine'
import { createStepSequencerNode } from './audio/stepSequencer.engine'
import { createScaleQuantizerNode } from './audio/scaleQuantizer.engine'
import { createChordNode } from './audio/chord.engine'
import { createArpeggiatorNode } from './audio/arpeggiator.engine'
import { createPolySynthNode } from './audio/polySynth.engine'
import { createDrumSamplerNode } from './audio/drumSampler.engine'
import { createAudioDelayNode } from './audio/fx/delay.engine'
import { createReverbNode } from './audio/fx/reverb.engine'
import { createBitcrusherNode } from './audio/fx/bitcrusher.engine'
import { createMasterOutputNode } from './audio/fx/masterOutput.engine'
import { createAudioMixerNode } from './audio/fx/audioMixer.engine'
import { AUDIO_NODE_TYPES } from './audio/audioNodes.constants'
import { nodeRegistry, type AxonNodeRegistry } from '../core/nodeRegistry'
import { NODE_TYPES } from './nodes.constants'

/**
 * Registers core node logic engines.
 * Safe for headless environments (no DOM dependencies).
 */
export function registerCoreNodes(registry: AxonNodeRegistry = nodeRegistry) {
  registry.register(NODE_TYPES.CLOCK, {
    type: NODE_TYPES.CLOCK,
    createEngine: createClockNode,
  })

  registry.register(NODE_TYPES.MATH, {
    type: NODE_TYPES.MATH,
    createEngine: createMathNode,
  })

  registry.register(NODE_TYPES.DISPLAY, {
    type: NODE_TYPES.DISPLAY,
    createEngine: createDisplayNode,
  })

  registry.register(NODE_TYPES.GROUP_INPUT, {
    type: NODE_TYPES.GROUP_INPUT,
    createEngine: createGroupInputNode,
  })

  registry.register(NODE_TYPES.GROUP_OUTPUT, {
    type: NODE_TYPES.GROUP_OUTPUT,
    createEngine: createGroupOutputNode,
  })

  registry.register(NODE_TYPES.SUBGRAPH, {
    type: NODE_TYPES.SUBGRAPH,
    createEngine: createSubgraphNode,
  })

  registry.register(NODE_TYPES.CONSTANT, {
    type: NODE_TYPES.CONSTANT,
    createEngine: createConstantNode,
  })

  registry.register(NODE_TYPES.EVENT, {
    type: NODE_TYPES.EVENT,
    createEngine: createEventNode,
  })

  registry.register(NODE_TYPES.COMMAND_HANDLER, {
    type: NODE_TYPES.COMMAND_HANDLER,
    createEngine: createCommandHandlerNode,
  })

  registry.register(NODE_TYPES.COMMAND_DISPATCH, {
    type: NODE_TYPES.COMMAND_DISPATCH,
    createEngine: createCommandDispatchNode,
  })

  registry.register(NODE_TYPES.COMPOSE_STRUCT, {
    type: NODE_TYPES.COMPOSE_STRUCT,
    createEngine: createComposeStructNode,
  })

  registry.register(NODE_TYPES.EXTRACT_COMPONENT, {
    type: NODE_TYPES.EXTRACT_COMPONENT,
    createEngine: createExtractComponentNode,
  })

  registry.register(NODE_TYPES.SQLITE_TABLE, {
    type: NODE_TYPES.SQLITE_TABLE,
    createEngine: createSqliteTableNode,
  })

  registry.register(NODE_TYPES.ROUTE_MATCH, {
    type: NODE_TYPES.ROUTE_MATCH,
    createEngine: createRouteMatchNode,
  })

  registry.register(NODE_TYPES.ROUTE_GUARD, {
    type: NODE_TYPES.ROUTE_GUARD,
    createEngine: createRouteGuardNode,
  })

  registry.register(NODE_TYPES.ROUTE_RENDER, {
    type: NODE_TYPES.ROUTE_RENDER,
    createEngine: createRouteRenderNode,
  })

  registry.register(NODE_TYPES.NAVIGATE, {
    type: NODE_TYPES.NAVIGATE,
    createEngine: createNavigateNode,
  })

  registry.register(NODE_TYPES.NAVIGATE_ROUTE, {
    type: NODE_TYPES.NAVIGATE_ROUTE,
    createEngine: createNavigateRouteNode,
  })

  registry.register(NODE_TYPES.ROUTE_PUSH, {
    type: NODE_TYPES.ROUTE_PUSH,
    createEngine: createRoutePushNode,
  })

  registry.register(NODE_TYPES.ROUTE_POP, {
    type: NODE_TYPES.ROUTE_POP,
    createEngine: createRoutePopNode,
  })

  registry.register(NODE_TYPES.ROUTE_REWRITE, {
    type: NODE_TYPES.ROUTE_REWRITE,
    createEngine: createRouteRewriteNode,
  })

  registry.register(NODE_TYPES.UML_TABLE, {
    type: NODE_TYPES.UML_TABLE,
    createEngine: createUmlTableNode,
  })

  registry.register(NODE_TYPES.TABLE_QUERY, {
    type: NODE_TYPES.TABLE_QUERY,
    createEngine: createTableQueryNode,
  })

  registry.register(NODE_TYPES.TABLE_JOIN, {
    type: NODE_TYPES.TABLE_JOIN,
    createEngine: createTableJoinNode,
  })

  registry.register(NODE_TYPES.ROUTE_PARAM, {
    type: NODE_TYPES.ROUTE_PARAM,
    createEngine: createRouteParamNode,
  })

  registry.register(NODE_TYPES.QUERY_PARAM, {
    type: NODE_TYPES.QUERY_PARAM,
    createEngine: createQueryParamNode,
  })

  registry.register(NODE_TYPES.QUERY_PARAMS, {
    type: NODE_TYPES.QUERY_PARAMS,
    createEngine: createQueryParamsNode,
  })

  registry.register(NODE_TYPES.ROUTE_INFO, {
    type: NODE_TYPES.ROUTE_INFO,
    createEngine: createRouteInfoNode,
  })

  registry.register(NODE_TYPES.URL_LOCATION, {
    type: NODE_TYPES.URL_LOCATION,
    createEngine: createUrlLocationNode,
  })

  registry.register(NODE_TYPES.ARRAY_TRANSFORM, {
    type: NODE_TYPES.ARRAY_TRANSFORM,
    createEngine: createArrayTransformNode,
  })

  registry.register(NODE_TYPES.OBJECT_TRANSFORM, {
    type: NODE_TYPES.OBJECT_TRANSFORM,
    createEngine: createObjectTransformNode,
  })

  registry.register(NODE_TYPES.ROUTE_SCOPE, {
    type: NODE_TYPES.ROUTE_SCOPE,
    createEngine: createRouteScopeNode,
  })

  registry.register(NODE_TYPES.GATE, {
    type: NODE_TYPES.GATE,
    createEngine: createGateNode,
  })

  registry.register(NODE_TYPES.LOGIC, {
    type: NODE_TYPES.LOGIC,
    createEngine: createLogicNode,
  })

  registry.register(NODE_TYPES.COMPARE, {
    type: NODE_TYPES.COMPARE,
    createEngine: createCompareNode,
  })

  registry.register(NODE_TYPES.FEEDBACK, {
    type: NODE_TYPES.FEEDBACK,
    createEngine: createFeedbackNode,
  })

  registry.register(NODE_TYPES.PAGE_ROUTER_DATA, {
    type: NODE_TYPES.PAGE_ROUTER_DATA,
    createEngine: createPageRouterDataNode,
  })

  registry.register(NODE_TYPES.COMPONENT_OUTPUT, {
    type: NODE_TYPES.COMPONENT_OUTPUT,
    createEngine: createComponentOutputNode,
  })

  registry.register(NODE_TYPES.TABLE_COMPONENT, {
    type: NODE_TYPES.TABLE_COMPONENT,
    createEngine: createTableComponentNode,
  })

  registry.register(NODE_TYPES.DB_PUT, {
    type: NODE_TYPES.DB_PUT,
    createEngine: createDbPutNode,
  })

  registry.register(NODE_TYPES.CHANGE_PAGE, {
    type: NODE_TYPES.CHANGE_PAGE,
    createEngine: createChangePageNode,
  })

  registry.register(NODE_TYPES.SET_QUERY_PARAM, {
    type: NODE_TYPES.SET_QUERY_PARAM,
    createEngine: createSetQueryParamNode,
  })

  registry.register(NODE_TYPES.SET_QUERY_PARAMS, {
    type: NODE_TYPES.SET_QUERY_PARAMS,
    createEngine: createSetQueryParamsNode,
  })

  registry.register(NODE_TYPES.TYPE_CONVERT, {
    type: NODE_TYPES.TYPE_CONVERT,
    createEngine: createTypeConvertNode,
  })

  registry.register(NODE_TYPES.RESOURCE, {
    type: NODE_TYPES.RESOURCE,
    createEngine: createResourceNode,
  })

  registry.register(NODE_TYPES.INVALIDATE_RESOURCE, {
    type: NODE_TYPES.INVALIDATE_RESOURCE,
    createEngine: createInvalidateResourceNode,
  })

  registry.register(NODE_TYPES.REFETCH_RESOURCE, {
    type: NODE_TYPES.REFETCH_RESOURCE,
    createEngine: createRefetchResourceNode,
  })

  registry.register(AUDIO_NODE_TYPES.AUDIO_CLOCK, {
    type: AUDIO_NODE_TYPES.AUDIO_CLOCK,
    createEngine: createAudioClockNode,
  })

  registry.register(AUDIO_NODE_TYPES.SEQUENCE, {
    type: AUDIO_NODE_TYPES.SEQUENCE,
    createEngine: createSequenceNode,
  })

  registry.register(AUDIO_NODE_TYPES.PARALLEL, {
    type: AUDIO_NODE_TYPES.PARALLEL,
    createEngine: createParallelNode,
  })

  registry.register(AUDIO_NODE_TYPES.EUCLIDEAN, {
    type: AUDIO_NODE_TYPES.EUCLIDEAN,
    createEngine: createEuclideanNode,
  })

  registry.register(AUDIO_NODE_TYPES.STEP_SEQUENCER, {
    type: AUDIO_NODE_TYPES.STEP_SEQUENCER,
    createEngine: createStepSequencerNode,
  })

  registry.register(AUDIO_NODE_TYPES.SCALE_QUANTIZER, {
    type: AUDIO_NODE_TYPES.SCALE_QUANTIZER,
    createEngine: createScaleQuantizerNode,
  })

  registry.register(AUDIO_NODE_TYPES.CHORD, {
    type: AUDIO_NODE_TYPES.CHORD,
    createEngine: createChordNode,
  })

  registry.register(AUDIO_NODE_TYPES.ARPEGGIATOR, {
    type: AUDIO_NODE_TYPES.ARPEGGIATOR,
    createEngine: createArpeggiatorNode,
  })

  registry.register(AUDIO_NODE_TYPES.POLY_SYNTH, {
    type: AUDIO_NODE_TYPES.POLY_SYNTH,
    createEngine: createPolySynthNode,
  })

  registry.register(AUDIO_NODE_TYPES.DRUM_SAMPLER, {
    type: AUDIO_NODE_TYPES.DRUM_SAMPLER,
    createEngine: createDrumSamplerNode,
  })

  registry.register(AUDIO_NODE_TYPES.DELAY, {
    type: AUDIO_NODE_TYPES.DELAY,
    createEngine: createAudioDelayNode,
  })

  registry.register(AUDIO_NODE_TYPES.REVERB, {
    type: AUDIO_NODE_TYPES.REVERB,
    createEngine: createReverbNode,
  })

  registry.register(AUDIO_NODE_TYPES.BITCRUSHER, {
    type: AUDIO_NODE_TYPES.BITCRUSHER,
    createEngine: createBitcrusherNode,
  })

  registry.register(AUDIO_NODE_TYPES.MASTER_OUTPUT, {
    type: AUDIO_NODE_TYPES.MASTER_OUTPUT,
    createEngine: createMasterOutputNode,
  })

  registry.register(AUDIO_NODE_TYPES.AUDIO_MIXER, {
    type: AUDIO_NODE_TYPES.AUDIO_MIXER,
    createEngine: createAudioMixerNode,
  })

  registry.register(AUDIO_NODE_TYPES.AUDIO_COMBINER, {
    type: AUDIO_NODE_TYPES.AUDIO_COMBINER,
    createEngine: createAudioMixerNode,
  })
}
