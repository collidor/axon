# Ticket 016: Interactive Documentation Viewer & Architecture Guide

**Labels**: `wayfinder:prototype`
**Status**: Closed
**Blocked by**: [015-vue-vapor-and-vite-plus-app-scaffold](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/015-vue-vapor-and-vite-plus-app-scaffold.md)
**Blocks**: [020-github-pages-deployment-pipeline-and-static-optimization](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/020-github-pages-deployment-pipeline-and-static-optimization.md)

---

## Question

How do we present comprehensive developer documentation for Axon with interactive architecture diagrams, code syntax highlighting, copyable snippet blocks, and API reference formatted identically to `@collidor/toolkit-docs`?

---

## Requirements

1. **Collapsible Sidebar with Quick Jump**:
   - `Sidebar.vue` displaying categorized documentation topics:
     - Overview & Architecture
     - Graph Runtime & Reactive Execution
     - Type-Safe Edge Connections & Struct Subtyping
     - Invertible Command Bus & Event Channels
     - Headless & Web Component Modes
     - Algorithmic Music & Strudel Engine
     - Subgraph Nesting & Scope Isolation
     - Pure TypeScript Graph Compilation
   - Search filter input to jump directly to any topic or API symbol.

2. **DocViewer Component (`DocViewer.vue`)**:
   - Structured sections with anchor tags for smooth scrolling.
   - Code blocks with syntax highlighting and one-click copy buttons.
   - Interactive callouts and badges (Feature, Breaking Change, Performance).
   - Embedded Mermaid diagrams illustrating dataflow and architecture.

3. **Verification**:
   - Documentation view navigates smoothly via sidebar links and updates hash URL.
   - Copy-to-clipboard works across all code snippets.
