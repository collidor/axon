# Ticket 041 – Window Listener, Contextmenu & Unmount Leaks Cleanup

**Goal**: Clean up window-level and graph-level event listeners upon unmount to eliminate memory and listener leaks.

## Context & Problem
1. In `src/web-components/nodes/umlTableNode.component.ts`, opening a column contextmenu attaches 4 window event listeners (`blur`, `pointerdown`, `contextmenu`, `keydown`). When `disconnectedCallback()` fires, it removes `.uml-row-context-menu` elements from the DOM without unregistering the window listeners.
2. In `src/web-components/axonStudio.component.ts`, `#graphEl.addEventListener('contextmenu', ...)` and `open-subgraph` are attached directly to `#graphEl` without being tracked in `#unsubs`, leaking on component re-mount.

## Requirements
1. **UML Context Menu Cleanup**:
   - In `AxonUmlTableNode`, track the active context menu cleanup function `#activeMenuCleanup: (() => void) | null`.
   - In `disconnectedCallback()`, invoke `#activeMenuCleanup?.()` before removing elements to ensure all window event listeners are detached.
2. **AxonStudio Event Listener Subscriptions**:
   - Wrap graph event listeners in `axonStudio.component.ts` (`contextmenu`, `open-subgraph`, and `audioSyncTimer`) and register their cleanup callbacks into `this.#unsubs`.
3. **Unit Tests**:
   - Verify unmounting `AxonUmlTableNode` while context menu is open detaches window listeners.
   - Verify unmounting `AxonStudio` runs all cleanup callbacks in `#unsubs`.

## Acceptance Criteria
- Zero leaked window listeners after closing or unmounting nodes.
- Full test pass rate.
