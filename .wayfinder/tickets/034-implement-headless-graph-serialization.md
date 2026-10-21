# Ticket 034 – Implement Headless Graph Serialization

**Goal**: Provide a pure‑JS/TS API to export and import an Axon graph without any DOM dependencies.

- Add `serializeHeadlessGraph(): SerializedGraph` on `BaseGraph` that returns a JSON‑compatible structure (nodes, ports, connections, node positions).
- Add static `deserializeHeadlessGraph(data: SerializedGraph): BaseGraph` to reconstruct the graph.
- Ensure all internal state (port values, connections, node metadata) is captured.
- Write unit tests under `src/__tests__/headless-serialization.test.ts` verifying round‑trip fidelity.
- Update README with usage example:
  ```ts
  const data = graph.serializeHeadlessGraph();
  const newGraph = BaseGraph.deserializeHeadlessGraph(data);
  ```

**Acceptance Criteria**
1. No imports from `@angular`/`@collidor/axon` UI modules.
2. Graph exported can be re‑imported with identical topology and values.
3. Tests pass in CI.
4. Documentation updated.
