# Ticket 019: In-Browser Vitest Test Runner & DevTools Dock

**Labels**: `wayfinder:prototype`
**Status**: Closed
**Blocked by**: [017-interactive-studio-ide-station-and-preset-demos](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/017-interactive-studio-ide-station-and-preset-demos.md), [018-component-and-node-sandbox-gallery](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/018-component-and-node-sandbox-gallery.md)
**Blocks**: [020-github-pages-deployment-pipeline-and-static-optimization](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/020-github-pages-deployment-pipeline-and-static-optimization.md)

---

## Question

How do we let visitors execute and verify the entire Axon test suite directly inside the browser, accompanied by an interactive bottom DevTools dock monitoring live telemetry, events, and audio status?

---

## Requirements

1. **In-Browser Test Runner Station (`TestRunnerView.vue`)**:
   - Interactive UI to trigger tests on demand (all tests or by category: Audio, Core, Flow, Web Components).
   - Real-time progress bar, suite count, passed/failed counters, and duration timers.
   - Expandable test case tree displaying individual test assertions and console outputs.

2. **Collapsible DevTools Dock (`DevToolsDock.vue`)**:
   - Bottom dock (dockable, collapsible, resizable) available across all tabs:
     - **Event Log**: Live stream of bus events, command executions, and undo/redo operations.
     - **Graph Inspector**: Selected node ID, active ports, dirty status, execution cycle count.
     - **Audio Telemetry**: Master AudioContext state (`running` / `suspended`), sample rate, current time, active synth voice count.
     - **Clear / Export Logs**: Button to clear logs or copy telemetry JSON.

3. **Verification**:
   - Clicking "Run All Tests" executes suites in-browser and displays green checkmarks.
   - Graph operations trigger live entries in the DevTools log.
