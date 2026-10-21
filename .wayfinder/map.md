# Wayfinder Map: Node-Based Algorithmic Music Engine, Studio Audio Playback & Clean Viewport

## Destination

A pure, zero-string-parser, node-based algorithmic music architecture in Axon (utilizing Sequence and Parallel visual graph nodes) with reliable Web Audio playback in the Studio IDE, full visual node parity (synths, samplers, audio effects, master output), multi-channel audio summing, and strict viewport containment:
1. **Zero String Parser Architecture**: All Strudel string parsing, mini-notation tokenizers, and mini-notation nodes are completely removed. Music patterns are composed purely out of **Sequence** and **Parallel** visual graph nodes alongside Euclidean, Step Sequencer, Chord, Scale Quantizer, PolySynth, Drum Sampler, and Audio Effects.
2. **Reliable Studio IDE Audio Playback & Node Connectivity**: All nodes in presets (such as Imperial March and Rhythm Stack) instantiate their custom Web Component elements with valid ports and edges. Multi-voice audio streams cleanly sum into Master Output with zero autoplay on load.
3. **Contained Viewport & Clean Scroll**: The canvas SVG and layout boundaries are strictly isolated, eliminating infinite scrollbars and layout distortion.

## Notes

- **Skills**: `codebase-design`, `tdd`, `domain-modeling`, `wayfinder`.
- **Constraint**: Strictly zero string parsing for music patterns. No Tidal/Strudel string notations.
- **Tracker**: Local markdown tracker under `.wayfinder/tickets/`.

## Decisions so far

- Prerequisite Core Engine & Audio System (Tickets 001–014): Axon visual graph, inspector, tokens, pipelines, subgraph drill-down, feedback loops, graph compilation, clock transport, music theory nodes, Web Audio PolySynth, 808 drum sampler, effects chain, and custom web components built.
- Vue Vapor Showcase App (Tickets 015–020): Documentation and showcase app scaffolded in `axon/demo`.
- Zero String Parser Architecture (Ticket 021): Completely removed all Strudel mini-notation string parsers, tokenizers, engines, and web components.
- Pure Graph Sequence & Parallel Nodes (Ticket 022): Implemented `SequenceNodeEngine`, `ParallelNodeEngine`, `axon-sequence-node`, and `axon-parallel-node`. Fully tested with 100% passing tests.
- Studio IDE Web Audio Sync (Ticket 023): Synced `AudioClockNodeEngine` with Web Audio `AudioDriverManager`, added auto-resume, and built the multi-voice pure graph "Imperial March" preset.
- Contained Viewport & Clean Scroll (Ticket 024): Scoped canvas SVG edges strictly to `.viewport > svg.edges, svg#svg` and established strict viewport container boundaries in the demo app to eliminate layout blowout.
- [Ticket 025: Fix Custom Element Tag Name Resolution & Registry in AxonGraph](.wayfinder/tickets/025-fix-node-tag-name-resolution.md): Added alias and registry mappings (`poly-synth` -> `axon-synth-node`) and registered custom element aliases so visual node cards always instantiate with valid ports.
- [Ticket 026: Create Audio FX Web Components (Delay, Reverb, Bitcrusher)](.wayfinder/tickets/026-create-audio-fx-web-components.md): Implemented `<axon-delay-node>`, `<axon-reverb-node>`, and `<axon-bitcrusher-node>` custom elements and registered them with `nodeRegistry`.
- [Ticket 027: Multi-Input Audio Summing and BaseGraph Connection Model](.wayfinder/tickets/027-multi-input-audio-summing.md): Added multi-channel summing support for audio input ports (`:audioIn`) in `BaseGraph`, `AxonGraph`, and `MasterOutputNodeEngine`.
- [Ticket 028: Studio Preset Audio Playback & Imperial March Graph Alignment](.wayfinder/tickets/028-studio-preset-audio-playback.md): Verified that all 9 nodes and 10 edges in Imperial March instantiate and connect cleanly, starting paused until the user activates playback.
- [Ticket 029: Headless Zero-DOM Decoupling & Export Hygiene](.wayfinder/tickets/029-headless-zero-dom-decoupling-and-export-hygiene.md): Decoupled DOM Web Component registrations from headless node library, sanitized selection manager DOM guards, added `get()` and `has()` to `AxonNodeRegistry`, and verified with `src/__tests__/headless.spec.ts`.
- [Ticket 030: Audio Lifecycle & Memory Leak Fixes](.wayfinder/tickets/030-audio-lifecycle-and-memory-leak-fixes.md): Cleared `#statusListeners` and reset dependencies in `BaseNode.destroy()`, hooked `disconnectedCallback()` in `AxonBaseNodeElement` to invoke `engine.destroy()`, and verified with `lifecycleCleanup.spec.ts`.
- [Ticket 031: Audio Math & Theory Bug Fixes](.wayfinder/tickets/031-audio-math-and-theory-bug-fixes.md): Fixed shortest-distance wrap-around in `ScaleQuantizerNodeEngine`, octave transpositions in `ArpeggiatorNodeEngine`, and boolean pulse clock output in `AudioClockNodeEngine`. Verified with `theoryAndClockFixes.spec.ts`.
- [Ticket 032: PolySynth Filter Envelope & Noise Generator](.wayfinder/tickets/032-polysynth-filter-envelope-and-noise-generator.md): Implemented dynamic ADSR filter envelope modulation and white noise buffer generator for `PolySynthNodeEngine`. Verified with `polySynth.spec.ts`.
- [Ticket 033: Visual Music Theory Components, Display Escaping & Audio Summing](.wayfinder/tickets/033-visual-music-theory-nodes-and-audio-summing.md): Created visual custom elements for Euclidean, ScaleQuantizer, Chord, and Arpeggiator nodes, and sanitized HTML in `AxonDisplayNode`. Verified with `theoryNodesAndSumming.spec.ts`.
- [Ticket 034: Headless Graph Serialization & Deserialization](.wayfinder/tickets/034-implement-headless-graph-serialization.md): Added `serializeHeadlessGraph(): SerializedGraph` and `BaseGraph.deserializeHeadlessGraph()` to enable building, serializing, saving, and re-hydrating graphs headlessly in pure Node/Deno/browser runtimes without DOM dependencies. Preserved `engine.position = { x, y }`.
- [Ticket 035: BaseGraph Port Metadata & Strict Single-Input Enforcing](.wayfinder/tickets/035-refactor-basegraph-port-metadata.md): Eliminated multi-input port summing and domain string checks (`audioIn`, `events`). Enforced strict modular DAG standard: exactly 1 connection per input port across all nodes (multi-signal audio mixing performed via dedicated `audio-mixer` node). Added `setPortValueSync(id, val)` for synchronous headless testing.
- [Ticket 036: AxonPort Output Registration & Web Component Lifecycle Cleanup](.wayfinder/tickets/036-fix-axonport-output-registration.md): Corrected `isAxonPort` direction guard in `AxonPort` so both input and output ports register cleanly and dispatch `axon-port-registered`. Added `AxonBox.disconnectedCallback()` to clean up lerp animation frame ticks and hooked `super.disconnectedCallback()` in `AxonBaseNodeElement`.
- [Ticket 037: Remove AxonInspector Component](.wayfinder/tickets/037-remove-axoninspector-component.md): Completely removed `AxonInspector` and all its references across `src/web-components/`, `axonStudio.component.ts`, and test suites, honoring the user constraint that all node editing controls remain strictly inline on node cards without sidebars.
- [Ticket 038: Node Drag Deadzones, Container Event Filtering & Fluent Ergonomics](.wayfinder/tickets/038-node-drag-deadzones-and-fluent-ergonomics.md): Eliminated node card drag deadzones in `AxonGraph` by allowing dragging and selecting on `.node-body`, `.audio-node-faceplate`, and node faceplates. Centralized interactive control filtering (`AxonGraph.isInteractiveControl`) so `<input>`, `<select>`, `<button>`, and `[data-interactive]` receive natural user interaction without requiring manual `stopPropagation` boilerplate in every node. Added fluent `node.connect()` and `graph.connect()` ergonomics.

- [Ticket 039: Single-Input Edge Replacement Undo Loss & Transaction History](.wayfinder/tickets/039-single-input-edge-replacement-undo-command.md): Tracked displaced edges in `AddEdgeCommand` and `AxonGraph`, ensuring symmetric undo/redo restoration when connecting to already-connected single-input ports.
- [Ticket 040: Eliminate Hardcoded Audio Port Checks in BaseNode via Generic Port Hooks](.wayfinder/tickets/040-eliminate-hardcoded-audio-checks-in-base-node.md): Stripped `portName === 'audioIn'` hardcoded checks from `BaseNode` and introduced generic `onPortConnect` and `onPortDisconnect` lifecycle hooks to `DelayNodeEngine`, `ReverbNodeEngine`, `BitcrusherNodeEngine`, and `MasterOutputNodeEngine`.
- [Ticket 041: Window Listener, Contextmenu & Unmount Leaks Cleanup](.wayfinder/tickets/041-window-listener-contextmenu-and-unmount-leaks-cleanup.md): Cleaned up global window listeners on unmount in `UmlTableNode` and bound contextmenu/subgraph cleanup in `AxonStudio`.
- [Ticket 042: Purge Residual AxonInspector and Strudel Mini-Notation Mentions](.wayfinder/tickets/042-purge-residual-axoninspector-and-strudel-mentions.md): Purged residual CSS classes, demo sidebar/devtools references, and updated documentation for pure node sequencing without mini-notation.
- [Ticket 043: Clean Foreign TTRPG Scope Creep from Network Module](.wayfinder/tickets/043-clean-foreign-ttrpg-scope-creep-from-network.md): Sanitized channel names, MIME types, and comments across `multiWindowIPC.ts`, `commandRegistry.ts`, and event indices.
- [Ticket 044: Headless Test Co-location, Decoupling & Documentation](.wayfinder/tickets/044-headless-test-colocation-and-documentation.md): Enforced strict zero-DOM test co-location in `src/nodes/__tests__/`, migrated web component tests to `src/web-components/__tests__/nodeComponents.spec.ts`, eliminated `globalThis._axonAudioContext`, added `src/__tests__/headless-serialization.test.ts`, and authored root `README.md`.
- [Ticket 045: Codebase Smells Refactoring (Switch Duplication, Middle Men & Naming)](.wayfinder/tickets/045-codebase-smells-refactoring.md): Unified compiler dynamic operator helpers with canonical templates in `operationMaps.ts`, exposed `AxonGraph.deleteNode(nodeId, undoable)` and integrated with `AxonStudio`, pruned 2-line trampoline files, renamed mysterious abbreviations, and updated `PortOffset`.
- [Ticket 046: Fix Demo Entity Combat Pipeline Graph Freeze & Microtask Loop](.wayfinder/tickets/046-fix-demo-entity-combat-graph-freeze.md): Resolved browser freeze when selecting the Entity Combat Pipeline preset in the demo by implementing incremental DOM updates in `AxonCompareNode`, `AxonGateNode`, and `AxonTypeConvertNode`, guarding `axon-port-registered`, bounding `BaseGraph.settle(maxIterations = 100)`, and preventing port destruction loops.
- [Ticket 047: Codebase Domain Refactoring, Modularity & Maintainability](.wayfinder/tickets/047-codebase-domain-refactoring-and-maintainability.md): Split multi-thousand line god-files (`dataGraphNodes.component.ts`, `actionNodes.component.ts`, `axonGraph.component.ts`, `axonStudio.component.ts`) into cohesive domain directories (`nodes/actions/`, `nodes/flow/`, `nodes/transform/`, `nodes/data/`, `nodes/routing/`, `graph/`, `studio/`), adopted descriptive variable and function naming, added explanatory comments on complex logic, and preserved 100% backward compatibility with all 52 test suites and 315 tests passing.

## Frontier (Open & Unblocked)

*(None)*

## Blocked

*(None)*

## Not yet specified

- Visual cable pulse speed scaling proportional to node sequence subdivision rate.

## Out of scope

- String parsing of Tidal/Strudel mini-notation DSL (expressly forbidden).
