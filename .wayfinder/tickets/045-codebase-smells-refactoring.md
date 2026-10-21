# Ticket 045 – Codebase Smells Refactoring (Switch Duplication, Middle Men & Naming)
Status: COMPLETED

**Goal**: Refactor identified Fowler code smells across the compiler, studio, and constants modules.

## Context & Problem
1. `src/compiler/nodeCompilers.ts` repeats manual switch statements for math, logic, and comparison operations that duplicate the canonical lookup tables in `src/nodes/math/operationMaps.ts`.
2. `axonStudio.component.ts` inspects internal DOM properties of node boxes to remove them rather than delegating to an `AxonGraph.deleteNode(nodeId)` method.
3. 2-line trampoline files (`src/nodes/dataGraphNodes.ts`, `resourceActionNodes.ts`, `routerNodes.ts`) add unnecessary indirection.
4. Unclear names (`Offset` `{ dx, dy, w, h }`, `na, nb, sa, sb`).

## Requirements
1. **Unify Compiler Operators with Operation Maps**:
   - In `src/compiler/nodeCompilers.ts`, reference canonical math/logic symbols directly from `operationMaps.ts` instead of duplicating switch cases.
2. **Expose Clean `deleteNode` on AxonGraph**:
   - Add `graph.deleteNode(nodeId, undoable?: boolean)` on `AxonGraph` and use it in `AxonStudio`.
3. **Clean Middle Man Trampolines & Mysterious Names**:
   - Clean up obsolete trampoline files and rename obscure abbreviations to clear identifiers.

## Acceptance Criteria
- Full test pass rate.
- Production build succeeds without errors.
