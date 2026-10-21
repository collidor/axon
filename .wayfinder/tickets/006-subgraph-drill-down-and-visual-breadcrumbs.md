# Subgraph Drill-Down and Visual Breadcrumbs

`wayfinder:task`
Status: Completed

## Outcome
- Created `<axon-breadcrumbs>` component with interactive trail navigation and styling in `src/web-components/axonBreadcrumbs.component.ts`.
- Integrated breadcrumb trail, double-click drill-down (`open-subgraph` event), `drillDownIntoSubgraph(nodeId)`, `navigateUpTo(depthIndex)`, and `exitCurrentSubgraph()` into `<axon-studio>`.
- Preserved navigation stack with parent graph snapshots and synchronized outer ports (`syncSubgraphPorts`) upon returning to parent graph.
- Added comprehensive unit tests in `src/web-components/__tests__/subgraphDrilldown.spec.ts` covering single and multi-level drill-down and navigation (5/5 passing).


## Question

How should `<axon-graph>` provide an interactive visual navigation experience for nested Subgraph nodes, including breadcrumbs, entering/exiting subgraphs, and synchronizing outer/inner port interfaces?

## Context

Axon already has `subgraph.node.ts` in headless core:
- A `SubgraphNodeEngine` hosts an inner `BaseGraph`.
- `group-input` and `group-output` nodes inside the subgraph expose ports to the parent node.
- Clock ticks and reactive values propagate through nested subgraphs in unit tests (`subgraph.navigation.spec.ts`).

However, in the Web Component canvas (`<axon-graph>`), there is currently no visual drill-down: double-clicking a `<axon-subgraph-node>` does not switch the canvas to display the inner graph with a breadcrumb trail.

## Plan & Decisions to Make

1. **Breadcrumb Bar**:
   - Provide `<axon-breadcrumbs>` or a breadcrumb trail in the studio header: `Root Graph > Damage Calculator > Inner Filter`.
2. **Double-Click Drill-Down**:
   - Double-clicking a subgraph node zooms smoothly into the node, saves parent viewport state on a navigation stack, and displays the inner graph on the canvas.
   - Clicking parent in breadcrumbs restores the parent canvas and updates the subgraph's visual dimensions/ports.
3. **Port Synchronization**:
   - When adding a `group-input` or `group-output` port inside the inner graph, the outer subgraph node's ports on the parent canvas update reactively in real time.
