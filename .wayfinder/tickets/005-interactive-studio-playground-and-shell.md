# Interactive Studio Playground and Shell

`wayfinder:prototype`

## Question

How should the visual graph development environment and standalone demo app (`index.html` and `src/main.ts`) be structured to provide a production-ready studio experience powered by `@collidor/ui`?

## Context

The previous Vue-based demo was deleted during the headless rewrite. Currently, `index.html` has commented-out tags and references deleted files.

A modern graph studio needs:
- A top toolbar with graph actions: New, Clear, Export JSON, Import JSON, Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), Layout DAG (auto-align), Run / Step simulation.
- A node palette (either collapsible sidebar, floating drawer with `<ui-drawer>`, or right-click search menu with `<ui-menu>`).
- The main infinite canvas with `<axon-graph>` supporting pan, zoom, marquee box-select, and edge routing.
- A status bar showing node count, edge count, zoom level, and execution fps.

## Plan & Decisions to Make

1. **Studio Layout**:
   - Construct a responsive shell using CSS Grid and `@collidor/ui` tokens.
   - Top action toolbar with graph actions: New, Clear, Export JSON, Import JSON, Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), Layout DAG (auto-align), Run / Step simulation.
   - Left collapsible node palette with live fuzzy search across categories (Math, Logic & Control, Data & Tables, Commands & Events, Time & Display).
   - Central canvas `<axon-graph>` with magnetic edge snapping, marquee box select, and drag panning.
   - Right collapsible `<axon-inspector>` panel bound to active selection.
   - Bottom status bar reporting real-time node count, edge count, selection count, zoom percentage, and simulation state.
2. **Context Menus & Node Creation**:
   - Right-click canvas or press `Space` to open floating quick-add popup with keyboard navigation.
   - Drag or click node items from palette to spawn on canvas.
3. **Preset Demos**:
   - Pre-wired sample pipelines:
     - Oscillator Pipeline (ClockNode -> MathNode -> MathNode -> DisplayNode)
     - Entity Combat Pipeline (EventNode -> CommandDispatchNode -> DisplayNode)
     - Data Transform Pipeline (ConstantNode -> CompareNode -> GateNode -> DisplayNode)
     - Blank Canvas

## Status: Completed & Verified

- Built `<axon-studio>` component (`src/web-components/axonStudio.component.ts`).
- Integrated studio shell styles in `src/web-components/axon.css`.
- Reconnected `index.html` and `src/main.ts` with standalone playground mounting.
- Full test coverage in `src/web-components/__tests__/axonStudio.spec.ts` (7 passing).
- All 35 test files (213 tests) passing with 0 errors across the entire codebase.
- Zero TypeScript compiler errors (`tsc --noEmit` exit 0).
