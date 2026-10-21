# Ticket 042 – Purge Residual AxonInspector and Strudel Mini-Notation Mentions

**Goal**: Clean up all leftover references to the deleted `AxonInspector` and forbidden Strudel mini-notation string syntax from documentation, styles, and demo views.

## Context & Problem
While `AxonInspector` and the Strudel parser engines were deleted from the runtime, legacy mentions remain in `axon.css`, `CONTEXT.md`, and the demo application (`Sidebar.vue`, `DocViewer.vue`).

## Requirements
1. **Remove CSS Inspector Classes**:
   - In `src/web-components/axon.css`, remove `.axon-studio-inspector-container` and any related obsolete inspector selectors.
2. **Update Demo Navigation & Documentation**:
   - In `demo/src/components/Sidebar.vue`, update `"Studio IDE & Inspector"` to `"Studio IDE"`.
   - In `demo/src/components/DocViewer.vue`, replace documentation of `<axon-inspector>` with documentation explaining Axon's self-contained inline node card architecture.
   - In `demo/src/components/DocViewer.vue`, remove mentions of *"Strudel algorithmic music synthesis"* in favor of pure node graph sequencing.
3. **Update CONTEXT.md**:
   - In `CONTEXT.md`, remove references to `Mini-Notation` string syntax and update definitions to describe pure Sequence & Parallel node-based pattern composition.

## Acceptance Criteria
- `git grep -i inspector` returns 0 results across `src/` and `demo/`.
- `git grep -i strudel` returns 0 results across `src/` and `demo/` (except historical changelog/tickets).
- Demo app builds with 0 errors.
