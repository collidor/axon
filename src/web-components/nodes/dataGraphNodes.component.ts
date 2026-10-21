/**
 * Domain-grouped re-export barrel for Axon data, flow, transform, and routing web components.
 * Split into modular domain directories:
 * - flow/ (AxonLogicNode, AxonCompareNode, AxonGateNode)
 * - transform/ (AxonArrayTransformNode, AxonObjectTransformNode, AxonTypeConvertNode)
 * - data/ (AxonTableQueryNode, AxonTableJoinNode, AxonComponentOutputNode, AxonTableComponentNode)
 * - routing/ (AxonRouteParamNode, AxonQueryParamNode, AxonQueryParamsNode, AxonRouteInfoNode, AxonUrlLocationNode, AxonRouteScopeNode, AxonPageRouterDataNode)
 */

import { TAG_NAMES } from '../constants.js'
import { AxonLogicNode, AxonCompareNode, AxonGateNode } from './flow/index.js'
import {
  AxonArrayTransformNode,
  AxonObjectTransformNode,
  AxonTypeConvertNode,
} from './transform/index.js'
import {
  AxonTableQueryNode,
  AxonTableJoinNode,
  AxonComponentOutputNode,
  AxonTableComponentNode,
} from './data/index.js'
import {
  AxonRouteParamNode,
  AxonQueryParamNode,
  AxonQueryParamsNode,
  AxonRouteInfoNode,
  AxonUrlLocationNode,
  AxonRouteScopeNode,
  AxonPageRouterDataNode,
} from './routing/index.js'

// Re-export all classes for full backward compatibility
export * from './flow/index.js'
export * from './transform/index.js'
export * from './data/index.js'
export * from './routing/index.js'

// Register custom elements under standard Axon tag names
if (typeof customElements !== 'undefined') {
  if (!customElements.get(TAG_NAMES.AXON_TABLE_QUERY_NODE)) {
    customElements.define(TAG_NAMES.AXON_TABLE_QUERY_NODE, AxonTableQueryNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_TABLE_JOIN_NODE)) {
    customElements.define(TAG_NAMES.AXON_TABLE_JOIN_NODE, AxonTableJoinNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_ROUTE_PARAM_NODE)) {
    customElements.define(TAG_NAMES.AXON_ROUTE_PARAM_NODE, AxonRouteParamNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_QUERY_PARAM_NODE)) {
    customElements.define(TAG_NAMES.AXON_QUERY_PARAM_NODE, AxonQueryParamNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_QUERY_PARAMS_NODE)) {
    customElements.define(TAG_NAMES.AXON_QUERY_PARAMS_NODE, AxonQueryParamsNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_ROUTE_INFO_NODE)) {
    customElements.define(TAG_NAMES.AXON_ROUTE_INFO_NODE, AxonRouteInfoNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_URL_LOCATION_NODE)) {
    customElements.define(TAG_NAMES.AXON_URL_LOCATION_NODE, AxonUrlLocationNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_ARRAY_TRANSFORM_NODE)) {
    customElements.define(TAG_NAMES.AXON_ARRAY_TRANSFORM_NODE, AxonArrayTransformNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_OBJECT_TRANSFORM_NODE)) {
    customElements.define(TAG_NAMES.AXON_OBJECT_TRANSFORM_NODE, AxonObjectTransformNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_ROUTE_SCOPE_NODE)) {
    customElements.define(TAG_NAMES.AXON_ROUTE_SCOPE_NODE, AxonRouteScopeNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_PAGE_ROUTER_DATA_NODE)) {
    customElements.define(TAG_NAMES.AXON_PAGE_ROUTER_DATA_NODE, AxonPageRouterDataNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_COMPONENT_OUTPUT_NODE)) {
    customElements.define(TAG_NAMES.AXON_COMPONENT_OUTPUT_NODE, AxonComponentOutputNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_TABLE_COMPONENT_NODE)) {
    customElements.define(TAG_NAMES.AXON_TABLE_COMPONENT_NODE, AxonTableComponentNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_LOGIC_NODE)) {
    customElements.define(TAG_NAMES.AXON_LOGIC_NODE, AxonLogicNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_COMPARE_NODE)) {
    customElements.define(TAG_NAMES.AXON_COMPARE_NODE, AxonCompareNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_GATE_NODE)) {
    customElements.define(TAG_NAMES.AXON_GATE_NODE, AxonGateNode)
  }
  if (!customElements.get(TAG_NAMES.AXON_TYPE_CONVERT_NODE)) {
    customElements.define(TAG_NAMES.AXON_TYPE_CONVERT_NODE, AxonTypeConvertNode)
  }
}
