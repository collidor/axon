# Ticket 024: Fix Oversized Viewport Layout and Scrollbar Expansion

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: None

---

## Question

What causes the entire screen to become gigantic and blow out the browser window scrollbar with an oversized SVG element, and how do we enforce strict container boundaries across Axon Graph, Studio IDE, and the Showcase shell?

---

## Root Causes & Diagnosis

1. **Unconstrained SVG Dimension in Global / Studio Scope**:
   - `axon.css` line 65 sets `svg { width: 10000px; height: 10000px; }`.
   - While intended for the infinite pan/zoom canvas inside `<axon-graph>` shadow root, if any SVG selector leaks or if `<axon-graph>` itself has unconstrained sizing, the 10000px SVG expands outer containers.
   - `svg` rule must be scoped strictly to `:host > .viewport > svg.edges` or `.viewport svg` inside `<axon-graph>` and must never bleed to document level.
2. **Outer Layout Shell Height & Overflow**:
   - In `demo/src/style.css`, `.docs-layout` has `min-height: 100vh; display: flex; flex-direction: column;` without `max-height: 100vh` or `overflow: hidden`.
   - In `StudioView.vue`, `.studio-view-container` has `height: calc(100vh - 60px)`.
   - `html, body` lack `overflow-x: hidden;` and in fullscreen or studio mode, need strict non-scrolling constraints.

---

## Requirements

1. In `src/web-components/axon.css`:
   - Scope the edge SVG strictly: `.viewport > svg.edges { width: 10000px; height: 10000px; pointer-events: none; position: absolute; }`.
   - Ensure `:host` has `contain: strict; overflow: hidden !important; width: 100%; height: 100%;`.
2. In `demo/src/style.css`:
   - Set `html, body { overflow-x: hidden; width: 100%; height: 100%; }`.
   - Ensure `.full-station-view` has `overflow: hidden; height: calc(100vh - 60px); max-height: calc(100vh - 60px);`.
3. In `demo/src/components/StudioView.vue`:
   - Set `.studio-view-container` to `height: 100%; width: 100%; max-height: calc(100vh - 60px); overflow: hidden;`.
4. Verify that in Studio IDE mode, no horizontal or vertical outer window scrollbars appear.
