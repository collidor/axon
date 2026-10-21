# Ticket 029: Headless Zero-DOM Decoupling & Export Hygiene

## Status: RESOLVED

## Context & Problem
The two-axis code review identified that `@collidor/axon/headless` and the headless engines in `src/nodes/nodeLibrary.ts` were importing `TAG_NAMES` from `../web-components/constants` to register visual web component tags.
Additionally, `src/systems/selectionManager.ts` assumed DOM globals (`HTMLElement`, `Document`, `CSS.escape`, `CustomEvent`) unconditionally, compromising zero-DOM guarantees for pure headless runtimes (Node.js, Workers, Edge).

## Requirements
1. Extract `registerWebComponentNodes` and `registerUiNodes` from `src/nodes/nodeLibrary.ts` into `src/web-components/nodes/registerWebComponentNodes.ts`.
2. Keep `registerCoreNodes` purely headless in `src/nodes/nodeLibrary.ts` with zero imports from `web-components`.
3. Re-export `registerWebComponentNodes` and `registerUiNodes` from `src/web-components/index.ts` and `src/index.ts` (preserving backward compatibility for full library consumers).
4. Guard `src/systems/selectionManager.ts` against missing DOM primitives (`CSS.escape`, `document`, `CustomEvent`, `HTMLElement`) so it can be used safely in both headless and DOM environments.
5. Update `demo/src/main.ts` and `src/web-components/__tests__/audioNodes.spec.ts` imports.
6. Verify all tests pass.
