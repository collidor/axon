import { describe, it, expect } from 'vitest'
import { DeltaUndoRedoStack } from '../undoRedo'
import type { GraphPatchOp } from '../patcher'

describe('DeltaUndoRedoStack', () => {
  it('manages mathematical forward and inverse delta operations', () => {
    const stack = new DeltaUndoRedoStack()

    const forward: GraphPatchOp = {
      op: 'ADD_NODE',
      node: { id: 'node_test', type: 'math', x: 10, y: 20 },
    }
    const inverse: GraphPatchOp = { op: 'DELETE_NODE', nodeId: 'node_test' }

    stack.record(forward, inverse)
    expect(stack.canUndo).toBe(true)
    expect(stack.canRedo).toBe(false)

    const undone = stack.undo()
    expect(undone).toEqual(inverse)
    expect(stack.canUndo).toBe(false)
    expect(stack.canRedo).toBe(true)

    const redone = stack.redo()
    expect(redone).toEqual(forward)
    expect(stack.canUndo).toBe(true)
  })
})
