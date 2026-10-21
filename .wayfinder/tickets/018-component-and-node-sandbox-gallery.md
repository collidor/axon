# Ticket 018: Component & Node Sandbox Gallery

**Labels**: `wayfinder:prototype`
**Status**: Closed
**Blocked by**: [015-vue-vapor-and-vite-plus-app-scaffold](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/015-vue-vapor-and-vite-plus-app-scaffold.md)
**Blocks**: [019-in-browser-vitest-test-runner-and-devtools-dock](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/019-in-browser-vitest-test-runner-and-devtools-dock.md), [020-github-pages-deployment-pipeline-and-static-optimization](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/020-github-pages-deployment-pipeline-and-static-optimization.md)

---

## Question

How do we provide a live sandbox gallery where developers can interactively test, tune, and inspect every individual Axon node in isolation?

---

## Requirements

1. **Gallery Viewport (`NodeGalleryView.vue`)**:
   - Categorized node browser:
     - **Math & Numbers**: Math Operation, Constant.
     - **Logic & Flow Control**: Logic, Compare, Gate, Type Converter, Feedback Latch.
     - **Events & Commands**: Event Bus, Command Dispatch, Command Handler.
     - **Data & Tables**: UML Table, SQLite Table, DB Put, Table Query, Route Param.
     - **Audio & Music**: Audio Clock, Mini-Notation, Euclidean Rhythm, Step Sequencer, Scale Quantizer, Chord Engine, Arpeggiator, PolySynth, Drum Sampler, Delay, Reverb, Bitcrusher, Master Output.

2. **Isolated Node Sandbox Workbench**:
   - Renders the selected node within an isolated mini-graph or standalone test canvas.
   - Live parameter control panel: allows users to adjust inputs and view reactive outputs and port states in real-time.
   - Sample input generators (e.g. mock clock pulses, test events, slider inputs) to verify node behavior interactively.

3. **Verification**:
   - Every node category can be selected and exercised.
   - Reactive changes in sandbox immediately update port values and outputs.
