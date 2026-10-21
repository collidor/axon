export const NODE_TYPES = {
  MATH: 'math-node',
  DISPLAY: 'display-node',
  GROUP_INPUT: 'group-input',
  GROUP_OUTPUT: 'group-output',
  CLOCK: 'clock-node',
  SUBGRAPH: 'subgraph-node',
  CONSTANT: 'constant-node',
  EVENT: 'event-node',
  COMMAND_HANDLER: 'command-handler-node',
  COMMAND_DISPATCH: 'command-dispatch-node',
  COMPOSE_STRUCT: 'compose-struct-node',
  EXTRACT_COMPONENT: 'extract-component-node',

  // Data Source & Schema Nodes (Available everywhere)
  SQLITE_TABLE: 'sqlite-table-node',
  DATA_SOURCE: 'data-source-node',
  UML_TABLE: 'uml-table-node',

  // Router Nodes (Encapsulated in Router Graph)
  ROUTE_MATCH: 'route-match-node',
  ROUTE_GUARD: 'route-guard-node',
  ROUTE_RENDER: 'route-render-node',
  NAVIGATE: 'navigate-node',
  NAVIGATE_ROUTE: 'navigate-route-node',
  ROUTE_PUSH: 'route-push-node',
  ROUTE_POP: 'route-pop-node',
  ROUTE_REWRITE: 'route-rewrite-node',

  // Data Graph & Route Dynamic Mapping Nodes
  TABLE_QUERY: 'table-query-node',
  TABLE_JOIN: 'table-join-node',
  ROUTE_PARAM: 'route-param-node',
  QUERY_PARAM: 'query-param-node',
  QUERY_PARAMS: 'query-params-node',
  ROUTE_INFO: 'route-info-node',
  URL_LOCATION: 'url-location-node',
  ARRAY_TRANSFORM: 'array-transform-node',
  OBJECT_TRANSFORM: 'object-transform-node',
  ROUTE_SCOPE: 'route-scope-node',

  // Logic & Flow Control Nodes
  GATE: 'gate-node',
  LOGIC: 'logic-node',
  COMPARE: 'compare-node',
  TYPE_CONVERT: 'type-convert-node',
  FEEDBACK: 'feedback-node',

  // Component Logic & Router Data Nodes
  PAGE_ROUTER_DATA: 'page-router-data-node',
  COMPONENT_OUTPUT: 'component-output-node',
  TABLE_COMPONENT: 'table-component-node',

  // Database Mutations & Async Flow Nodes
  DB_PUT: 'db-put-node',

  // Route & Query Mutation Nodes (Available in Action Graphs & Workflows)
  CHANGE_PAGE: 'change-page-node',
  SET_QUERY_PARAM: 'set-query-param-node',
  SET_QUERY_PARAMS: 'set-query-params-node',

  // Reusable Query & Data Subgraphs
  RESOURCE: 'resource-node',
  INVALIDATE_RESOURCE: 'invalidate-resource-node',
  REFETCH_RESOURCE: 'refetch-resource-node',
} as const

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]
