# Ticket 030: Audio Lifecycle & Memory Leak Fixes

## Status: RESOLVED

## Context & Problem
Audio node engines (`PolySynthNodeEngine`, `AudioMixerNodeEngine`, etc.) and visual node elements created audio buses, timers, and listeners that could leak if nodes were destroyed or removed from DOM. `BaseNode.destroy()` failed to clear `#statusListeners` and `#settleDependencies`. Visual custom elements extending `AxonBaseNodeElement` did not call `destroy()` on their underlying engine upon `disconnectedCallback()`.

## Requirements
1. Update `BaseNode.destroy()` to clear `#statusListeners` and reset `#settleDependencies`.
2. Update `AxonBaseNodeElement.disconnectedCallback()` to destroy `this.engine` when the element is removed from DOM.
3. Verify that `PolySynthNodeEngine` and `AudioMixerNodeEngine` unregister their audio buses on destruction.
4. Add comprehensive unit tests in `src/nodes/audio/__tests__/lifecycleCleanup.spec.ts`.
