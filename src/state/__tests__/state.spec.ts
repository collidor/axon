import { describe, it, expect } from 'vitest'
import {
  createImplicitContext,
  advanceExecutionContext,
  ExecutionTransaction,
  MVCCConcurrencyEngine,
  GraphDiffEngine,
  GraphPatcher,
  DeltaUndoRedoStack,
} from '../index'

describe('Deep State Engine (Unified state module)', () => {
  it('manages transactional execution and context recursion depth', () => {
    const ctx = createImplicitContext({ executionDepth: 1, maxRecursionDepth: 2 })
    expect(ctx.executionDepth).toBe(1)
    const next = advanceExecutionContext(ctx)
    expect(next.executionDepth).toBe(2)
  })

  it('manages MVCC versioning and concurrency isolation', () => {
    const valid = MVCCConcurrencyEngine.validate(3, 3)
    expect(valid.valid).toBe(true)

    const invalid = MVCCConcurrencyEngine.validate(1, 2)
    expect(invalid.valid).toBe(false)
    expect(invalid.reason).toBe('STATE_STALE')
  })

  it('diffs and detects graph conflict conditions', () => {
    const mainGraph = {
      version: 1,
      nodes: [{ id: 'n1', type: 'math', x: 0, y: 0 }],
      edges: [],
    }

    const branch = {
      name: 'feature-1',
      patches: [
        {
          op: 'ADD_EDGE' as const,
          edge: { from: 'missing-node:out', to: 'n1:in' },
        },
      ],
    }

    const conflicts = GraphDiffEngine.detectConflicts(mainGraph, branch)
    expect(conflicts.length).toBeGreaterThan(0)
    expect(conflicts[0]).toContain("references missing source Node 'missing-node'")
  })

  it('provides undo and redo over graph delta operations', () => {
    const undoStack = new DeltaUndoRedoStack()
    const forward = {
      op: 'ADD_NODE' as const,
      node: { id: 'n1', type: 'math', x: 0, y: 0 },
    }
    const inverse = { op: 'DELETE_NODE' as const, nodeId: 'n1' }

    undoStack.record(forward, inverse)
    expect(undoStack.canUndo).toBe(true)

    const undone = undoStack.undo()
    expect(undone).toEqual(inverse)
    expect(undoStack.canRedo).toBe(true)

    const redone = undoStack.redo()
    expect(redone).toEqual(forward)
  })
})
