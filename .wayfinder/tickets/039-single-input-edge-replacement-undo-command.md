# Ticket 039 – Single-Input Edge Replacement Undo Loss & Transaction History

**Goal**: Ensure that replacing an existing connection on a single-input port preserves the displaced edge in the command history so that Undo (`Ctrl+Z`) restores the previous connection.

## Context & Problem
In Axon, input ports strictly accept at most 1 incoming connection. In `AxonGraph`, connecting a new edge to an already-connected input port removes the existing incoming edge. However, the inverse command created in `axonGraph.component.ts` was only `new RemoveEdgeCommand({ edge: newEdge })`. When Undo is triggered, the new edge is removed, but the displaced edge is permanently lost, leaving the input port disconnected.

## Requirements
1. **Preserve Displaced Edge in Command Payload**:
   - `AddEdgeCommand` should support an optional `displacedEdge?: SerializedEdge` in its payload.
   - When `executeCommand(forward, inverse)` is called upon completing an edge connection in `AxonGraph`:
     - Detect any existing edge connected to `toPortId`.
     - If an existing edge is present, capture it as `displacedEdge`.
     - Construct a composite inverse (or composite transaction) such that Undo removes `newEdge` AND re-adds `displacedEdge` to both `BaseGraph` and the DOM.
2. **Redo Integrity**:
   - Redoing the action must re-apply the new edge and re-displace the prior edge cleanly without duplicating edges or desynchronizing `BaseGraph`.
3. **Unit Tests**:
   - Add integration tests in `axonGraph.flow.spec.ts` verifying that:
     1. Connecting Node A -> Node C (`input`), then Node B -> Node C (`input`) replaces the edge.
     2. Pressing `Undo` restores Node A -> Node C.
     3. Pressing `Redo` restores Node B -> Node C.

## Acceptance Criteria
- Replacing an incoming edge on an input port and executing `undo()` successfully restores the displaced edge in both DOM and `BaseGraph`.
- Re-executing `redo()` cleanly replaces it again.
- All tests pass.
