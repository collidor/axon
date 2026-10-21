# Ticket 047: Codebase Domain Refactoring, Modularity & Maintainability

**Status**: Completed  
**Domain**: Architecture / Web Components / Maintainability  

---

## 1. Context & Motivation
Following the growth of `@collidor/axon`, several central web component files became massive god-files exceeding 1,000–2,500 lines:
- `src/web-components/nodes/dataGraphNodes.component.ts` (2,597 lines)
- `src/web-components/axonGraph.component.ts` (1,893 lines)
- `src/web-components/axonStudio.component.ts` (1,424 lines)
- `src/web-components/nodes/actionNodes.component.ts` (613 lines)

These monolithic files mixed disparate domains (audio transport, breadcrumb hierarchy, SVG bezier rendering, LOD background grid math, data table operations, routing parameters, and transform operations) within single files, obscuring logic, complicating code review, and accumulating single-letter / abbreviated variable names.

---

## 2. Changes Made

### 2.1 Domain Split of Node Web Components
Split `dataGraphNodes.component.ts` and `actionNodes.component.ts` into specialized, cohesive sub-domain folders with dedicated barrel exports and explanatory JSDoc comments:
- **`src/web-components/nodes/actions/`**:
  - `commandDispatchNode.component.ts`: `AxonCommandDispatchNode` with incremental DOM guards and explicit command payload parameters.
  - `eventNode.component.ts`: `AxonEventNode` with typed mode toggles (listen/emit).
  - `changePageNode.component.ts`: `AxonChangePageNode` with transition styling and route target inputs.
  - `index.ts`: Barrel export.
- **`src/web-components/nodes/flow/`**:
  - `logicNode.component.ts`: `AxonLogicNode` (AND, OR, NOT, XOR) with incremental DOM updates.
  - `compareNode.component.ts`: `AxonCompareNode` with port preservation across operator changes.
  - `gateNode.component.ts`: `AxonGateNode` with live condition pass-through.
  - `index.ts`: Barrel export.
- **`src/web-components/nodes/transform/`**:
  - `arrayTransformNode.component.ts`: `AxonArrayTransformNode` (MAP, FILTER, REDUCE, SORT).
  - `objectTransformNode.component.ts`: `AxonObjectTransformNode` (PICK, OMIT, MERGE).
  - `typeConvertNode.component.ts`: `AxonTypeConvertNode` with live format conversion.
  - `index.ts`: Barrel export.
- **`src/web-components/nodes/data/`**:
  - `tableQueryNode.component.ts`: `AxonTableQueryNode` with pagination and filter controls.
  - `tableJoinNode.component.ts`: `AxonTableJoinNode` with relational join semantics.
  - `componentOutputNode.component.ts`: `AxonComponentOutputNode` with tabbed output slots.
  - `tableComponentNode.component.ts`: `AxonTableComponentNode`.
  - `index.ts`: Barrel export.
- **`src/web-components/nodes/routing/`**:
  - `routeParamNode.component.ts`: `AxonRouteParamNode`.
  - `queryParamNode.component.ts`: `AxonQueryParamNode`.
  - `queryParamsNode.component.ts`: `AxonQueryParamsNode`.
  - `routeInfoNode.component.ts`: `AxonRouteInfoNode`.
  - `urlLocationNode.component.ts`: `AxonUrlLocationNode`.
  - `routeScopeNode.component.ts`: `AxonRouteScopeNode`.
  - `pageRouterDataNode.component.ts`: `AxonPageRouterDataNode`.
  - `index.ts`: Barrel export.
- Retained original entrypoints `dataGraphNodes.component.ts` and `actionNodes.component.ts` as re-export barrels registering `TAG_NAMES` in customElements for 100% backward compatibility.

### 2.2 Domain Controllers for AxonGraph
Decomposed `AxonGraph` into five focused controllers under `src/web-components/graph/`:
- **`graphViewport.ts` (`GraphViewportController`)**:
  - Hardware-accelerated CSS matrix transforms for panning and zooming.
  - Smooth multi-octave Level-of-Detail (LOD) logarithmic background dot grid calculation with opacity cross-fading.
  - Mouse wheel zoom with pointer centering and `autoZoom`/`zoomToFit` with column padding calculations.
- **`graphConnection.ts` (`GraphConnectionController`)**:
  - Port drag-and-drop connection lifecycle (`isConnecting`, `connStartPort`, `hoveredPort`, `ghostPos`).
  - Candidate port discovery and validity badge styling using `engine.canConnectPorts()`.
  - Magnetic snapping to socket dot centers.
  - Single-input connection displacement and dispatch of `AddEdgeCommand`.
- **`graphSelection.ts` (`GraphSelectionController`)**:
  - Marquee selection rubber-band visualization and world-space bounding box intersection.
  - Multi-node pointer dragging with magnetic DAG physics alignment and layout engine integration.
- **`graphEdgeRenderer.ts` (`GraphEdgeRenderer`)**:
  - SVG DOM pooling (`edgeMap`).
  - Cubic bezier paths and viewport culling (`isEdgeInViewport`) suppressing offscreen edges.
  - Themed pulse wave shimmer animations dynamically styled by port data type.
  - Ghost cable rendering.
- **`graphAdjacency.ts` (`GraphAdjacencyManager`)**:
  - Edge caching and port geometry offset tracking.
  - Debounced microtask scheduler for adjacency rebuilds (`scheduleAdjacency`).
  - Port connectivity callbacks (`onConnected`, `onDisconnected`) and initial signal propagation.

### 2.3 Domain Controllers for AxonStudio
Decomposed `AxonStudio` into three focused controllers and palette definitions under `src/web-components/studio/`:
- **`studioPaletteData.ts`**:
  - Extracted `NODE_PALETTE_CATEGORIES` and `PRESET_GRAPHS` from studio shell.
- **`studioAudioTransport.ts` (`StudioAudioTransportController`)**:
  - Audio transport synchronization, BPM tempo management, tap tempo calculation, and Web Audio context resume.
- **`studioQuickAddPalette.ts` (`StudioQuickAddController`)**:
  - Floating search popup, category/item filtering, keyboard shortcuts, and node spawning.
- **`studioSubgraphController.ts` (`StudioSubgraphController`)**:
  - Subgraph drilldown stack, parent snapshot persistence, breadcrumb updates, and port synchronization upon return.

### 2.4 Code Readability & Standards
- Removed all cryptic single-letter/abbreviated variables (`s`, `e`, `gp`, `fwd`, `inv`, `cyc`, `unsub`).
- Added explanatory docstrings and inline comments detailing mathematical concepts (logarithmic octave LOD grid, cubic bezier formulas, magnetic candidate snapping).
- Preserved strict zero-DOM isolation in `src/core/` and `src/nodes/`.

---

## 3. Verification
- **Unit & Integration Tests**: All 52 test files (315 tests) pass (`pnpm exec vitest run`).
- **Static Type Checking**: `pnpm exec tsc --noEmit` passes with 0 errors.
- **Production Package Build**: `pnpm build` bundles `dist/` ESM/CJS cleanly in 404ms.
- **Interactive Documentation App**: `pnpm build` in `axon/demo` succeeds in 528ms.
