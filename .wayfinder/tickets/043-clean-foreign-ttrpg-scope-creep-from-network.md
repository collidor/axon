# Ticket 043 – Clean Foreign TTRPG Scope Creep from Network Module

**Goal**: Clean up foreign application strings in `src/network/multiWindowIPC.ts` to reflect the generic `@collidor/axon` graph domain.

## Context & Problem
`src/network/multiWindowIPC.ts` contains hardcoded strings (`'system_playmat_ipc'`, `'application/x-ttrpg-entity'`) that leaked from an external application. These should be generic Axon graph constants.

## Requirements
1. **Generic Network Constants**:
   - In `src/network/multiWindowIPC.ts`, change default channel name to `'axon_graph_ipc'`.
   - Update `CrossWindowDnDPayload.mimeType` to `'application/x-axon-node'`.
2. **Update Tests**:
   - Update any tests in `src/network/__tests__/` referencing the old channel or mime-type.

## Acceptance Criteria
- Zero occurrences of `playmat` or `ttrpg` in `src/network/`.
- All network tests pass.
