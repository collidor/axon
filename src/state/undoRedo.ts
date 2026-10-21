import type { GraphPatchOp } from './patcher'

export interface DeltaHistoryEntry {
  forward: GraphPatchOp
  inverse: GraphPatchOp
}

export class DeltaUndoRedoStack {
  private undoStack: DeltaHistoryEntry[] = []
  private redoStack: DeltaHistoryEntry[] = []
  private maxHistory: number

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory
  }

  public record(forward: GraphPatchOp, inverse: GraphPatchOp): void {
    this.undoStack.push({ forward, inverse })
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  public undo(): GraphPatchOp | undefined {
    const entry = this.undoStack.pop()
    if (!entry) return undefined

    this.redoStack.push(entry)
    return entry.inverse
  }

  public redo(): GraphPatchOp | undefined {
    const entry = this.redoStack.pop()
    if (!entry) return undefined

    this.undoStack.push(entry)
    return entry.forward
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  public clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
