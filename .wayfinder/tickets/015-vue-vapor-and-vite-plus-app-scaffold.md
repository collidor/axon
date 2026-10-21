# Ticket 015: Vue Vapor & Vite Plus App Scaffold

**Labels**: `wayfinder:prototype`
**Status**: Closed
**Blocked by**: None
**Blocks**: [016-interactive-documentation-viewer-and-architecture-guide](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/016-interactive-documentation-viewer-and-architecture-guide.md), [017-interactive-studio-ide-station-and-preset-demos](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/017-interactive-studio-ide-station-and-preset-demos.md), [018-component-and-node-sandbox-gallery](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/018-component-and-node-sandbox-gallery.md)

---

## Question

How do we scaffold a fast, zero-Virtual-DOM Vue Vapor documentation and demo application in `axon/demo` (mirroring `@collidor/toolkit-docs`), powered by Vite Plus (`vp`) and linked to workspace packages?

---

## Requirements

1. **Package Setup in `axon/demo`**:
   - Initialize package `@collidor/axon-docs` in `axon/demo` with `pnpm-workspace` integration.
   - Configure dependencies: `vue` (Vapor mode), `@collidor/axon`, `@collidor/ui`, `@collidor/struct`, `@collidor/command`.
   - Setup Vite Plus configuration (`vite.config.ts` using `@voidzero-dev/vite-plus-core` / `vite-plus`) with Vue Vapor compiler flags.
   - Configure scripts: `pnpm run dev` (`vp dev`), `pnpm run build` (`vp build`), `pnpm run preview` (`vp preview`).

2. **Application Shell & Layout**:
   - Top `Navbar.vue`:
     - Brand logo with gradient.
     - Tab navigation: `Docs`, `Studio IDE`, `Strudel Music`, `Node Gallery`, `Test Suite`.
     - Theme selector (`Dark Matte`, `Neumorphic`, `Jewel`, `Cyberpunk`, `Retro Parchment`).
     - GitHub repository link and version badge.
   - Hash-based SPA routing synchronizer (`#docs`, `#studio`, `#music`, `#gallery`, `#tests`).
   - Global stylesheet matching Collidor design tokens and typography.

3. **Verification**:
   - `vp dev` starts cleanly on localhost.
   - `vp build` compiles without errors.
