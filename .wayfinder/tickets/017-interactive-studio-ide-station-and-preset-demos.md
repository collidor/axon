# Ticket 017: Interactive Studio IDE Station & Preset Demos

**Labels**: `wayfinder:prototype`
**Status**: Closed
**Blocked by**: [015-vue-vapor-and-vite-plus-app-scaffold](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/015-vue-vapor-and-vite-plus-app-scaffold.md)
**Blocks**: [019-in-browser-vitest-test-runner-and-devtools-dock](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/019-in-browser-vitest-test-runner-and-devtools-dock.md), [020-github-pages-deployment-pipeline-and-static-optimization](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/020-github-pages-deployment-pipeline-and-static-optimization.md)

---

## Question

How do we present the full `<axon-studio>` environment as an interactive playground station inside the Vue Vapor shell, with pre-loaded preset graphs, live code generation, and responsive fullscreen toggle?

---

## Requirements

1. **Studio Viewport (`StudioView.vue`)**:
   - Embed `<axon-studio>` web component with full container responsiveness.
   - Quick preset selector buttons prominently accessible in the UI:
     - 🎵 **Strudel Algorithmic Beat**: Clock + Mini-Notation + 808 Drums + PolySynth + Master Output.
     - ⚔️ **Entity Combat Engine**: Event Bus + Command Dispatch + Damage Pipeline.
     - 🔁 **Feedback Accumulator**: Discrete time unit delay accumulator with Z⁻¹ loop.
     - ⧉ **Nested Subgraph**: Multi-layer pipeline with drill-down and breadcrumbs.
     - ⚡ **Data Transformations**: Dynamic filter, compare, and gate pipeline.

2. **Code Export & Compiler Integration**:
   - Side drawer or modal displaying live compiled TypeScript code (`compileToSource()`) corresponding to the currently active graph.
   - Syntax-highlighted output with copy button and run button.

3. **Verification**:
   - Switching presets updates the visual canvas immediately.
   - Studio interactions (drag nodes, connect ports, zoom, pan) function smoothly inside Vue Vapor.
