import type { ImplicitContext } from './context'
import { MVCCConcurrencyEngine } from './mvcc'

export type TransactionPhase = 'EXECUTE' | 'ATOMIC_COMMIT' | 'DISPATCH_FLUSH'
export type TransactionStatus = 'PENDING' | 'COMMITTED' | 'ROLLED_BACK'
export type StorageClass = 'LOCAL_ONLY' | 'REMOTE_CACHE' | 'REPLICATED'

export interface StagedEntityMutation {
  entityId: string
  structId?: string
  storageClass?: StorageClass
  patch: Record<string, unknown>
  isNew?: boolean
  expectedSequenceId?: number
}

export interface StagedEdgeMutation {
  op: 'LINK' | 'UNLINK'
  sourceId: string
  relationName: string
  targetId: string
  metadata?: Record<string, unknown>
}

export interface StagedEvent {
  eventName: string
  payload: unknown
}

export interface EntityStoreAdapter {
  getEntity(
    id: string,
  ):
    | { id: string; struct_id?: string; sequence_id: number; data: Record<string, unknown> }
    | undefined
  saveEntity(id: string, structId: string, sequenceId: number, data: Record<string, unknown>): void
  deleteEntity(id: string): void
  linkEdge?(
    sourceId: string,
    relationName: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ): void
  unlinkEdge?(sourceId: string, relationName: string, targetId: string): void
  beginTransaction?(): void | Promise<void>
  commitTransaction?(): void | Promise<void>
  rollbackTransaction?(): void | Promise<void>
}

export interface TransactionCommitResult {
  success: boolean
  mutatedEntityIds: string[]
  updatedEntities: Record<
    string,
    { struct_id: string; sequence_id: number; data: Record<string, unknown> }
  >
  deletedEntityIds: string[]
  stagedEvents: StagedEvent[]
  error?: string
}

export class ExecutionTransaction {
  public readonly transactionId: string
  public phase: TransactionPhase = 'EXECUTE'
  public status: TransactionStatus = 'PENDING'
  public context: ImplicitContext

  private stagedMutations = new Map<string, StagedEntityMutation>()
  private stagedDeletions = new Set<string>()
  private stagedEdges: StagedEdgeMutation[] = []
  private stagedEvents: StagedEvent[] = []

  constructor(
    context: ImplicitContext,
    transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  ) {
    this.context = context
    this.transactionId = transactionId
  }

  // --- Phase 1: EXECUTE (Staging & Copy-on-Write) ---

  public stageInsert(
    entityId: string,
    structId: string,
    initialData: Record<string, unknown>,
    storageClass: StorageClass = 'REPLICATED',
  ): void {
    this.stagedDeletions.delete(entityId)
    this.stagedMutations.set(entityId, {
      entityId,
      structId,
      storageClass,
      patch: { ...initialData },
      isNew: true,
      expectedSequenceId: 1,
    })
  }

  public stageUpdate(
    entityId: string,
    patch: Record<string, unknown>,
    expectedSequenceId?: number,
  ): void {
    if (this.stagedDeletions.has(entityId)) return

    const existing = this.stagedMutations.get(entityId)
    if (existing) {
      existing.patch = { ...existing.patch, ...patch }
    } else {
      this.stagedMutations.set(entityId, {
        entityId,
        patch: { ...patch },
        isNew: false,
        expectedSequenceId,
      })
    }
  }

  public stageDelete(entityId: string): void {
    this.stagedMutations.delete(entityId)
    this.stagedDeletions.add(entityId)
  }

  public stageLink(
    sourceId: string,
    relationName: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.stagedEdges.push({
      op: 'LINK',
      sourceId,
      relationName,
      targetId,
      metadata,
    })
  }

  public stageUnlink(sourceId: string, relationName: string, targetId: string): void {
    this.stagedEdges.push({
      op: 'UNLINK',
      sourceId,
      relationName,
      targetId,
    })
  }

  public stageEvent(eventName: string, payload: unknown): void {
    this.stagedEvents.push({ eventName, payload })
  }

  public getStagedState(
    entityId: string,
    baseData: Record<string, unknown> = {},
  ): Record<string, unknown> | null {
    if (this.stagedDeletions.has(entityId)) return null
    const staged = this.stagedMutations.get(entityId)
    if (staged) {
      return staged.isNew ? { ...staged.patch } : { ...baseData, ...staged.patch }
    }
    return baseData
  }

  // --- Phase 2: ATOMIC DB COMMIT ---

  public async commit(store: EntityStoreAdapter): Promise<TransactionCommitResult> {
    if (this.status !== 'PENDING') {
      throw new Error(`Cannot commit transaction in ${this.status} state.`)
    }

    this.phase = 'ATOMIC_COMMIT'

    // 1. MVCC Concurrency Validation against current store state
    for (const [entityId, mutation] of this.stagedMutations.entries()) {
      if (!mutation.isNew && mutation.expectedSequenceId !== undefined) {
        const liveEntity = store.getEntity(entityId)
        if (!liveEntity) {
          this.rollback()
          return {
            success: false,
            mutatedEntityIds: [],
            updatedEntities: {},
            deletedEntityIds: [],
            stagedEvents: [],
            error: `Target entity ${entityId} not found.`,
          }
        }

        const mvccCheck = MVCCConcurrencyEngine.validate(
          mutation.expectedSequenceId,
          liveEntity.sequence_id,
        )
        if (!mvccCheck.valid) {
          this.rollback()
          return {
            success: false,
            mutatedEntityIds: [],
            updatedEntities: {},
            deletedEntityIds: [],
            stagedEvents: [],
            error: `MVCC Conflict (STATE_STALE) on entity ${entityId}: expected v${mutation.expectedSequenceId}, actual v${liveEntity.sequence_id}`,
          }
        }
      }
    }

    // 2. Atomic Batch Commit with Snapshot Guard
    const mutatedEntityIds: string[] = []
    const updatedEntities: Record<
      string,
      { struct_id: string; sequence_id: number; data: Record<string, unknown> }
    > = {}
    const deletedEntityIds = Array.from(this.stagedDeletions)

    // Capture pre-commit snapshot for rollback restoration
    const preCommitSnapshots = new Map<
      string,
      { structId: string; seq: number; data: Record<string, unknown> } | null
    >()
    const affectedEntityIds = new Set<string>([
      ...this.stagedMutations.keys(),
      ...this.stagedDeletions,
    ])
    for (const entityId of affectedEntityIds) {
      const existing = store.getEntity(entityId)
      preCommitSnapshots.set(
        entityId,
        existing
          ? {
              structId: existing.struct_id ?? 'unknown',
              seq: existing.sequence_id,
              data: { ...existing.data },
            }
          : null,
      )
    }

    try {
      if (store.beginTransaction) {
        await store.beginTransaction()
      }

      // Process Deletions
      for (const entityId of this.stagedDeletions) {
        store.deleteEntity(entityId)
      }

      // Process Insertions and Updates
      for (const [entityId, mutation] of this.stagedMutations.entries()) {
        const liveEntity = store.getEntity(entityId)
        const currentSeq = liveEntity?.sequence_id ?? 0
        const nextSeq = currentSeq + 1
        const structId = mutation.structId || liveEntity?.struct_id || 'unknown'

        const base = liveEntity?.data ?? {}
        const mergedData = mutation.isNew ? { ...mutation.patch } : { ...base, ...mutation.patch }

        store.saveEntity(entityId, structId, nextSeq, mergedData)
        mutatedEntityIds.push(entityId)
        updatedEntities[entityId] = {
          struct_id: structId,
          sequence_id: nextSeq,
          data: mergedData,
        }
      }

      // Process Edge Operations
      for (const edgeOp of this.stagedEdges) {
        if (edgeOp.op === 'LINK' && store.linkEdge) {
          store.linkEdge(edgeOp.sourceId, edgeOp.relationName, edgeOp.targetId, edgeOp.metadata)
        } else if (edgeOp.op === 'UNLINK' && store.unlinkEdge) {
          store.unlinkEdge(edgeOp.sourceId, edgeOp.relationName, edgeOp.targetId)
        }
      }

      if (store.commitTransaction) {
        await store.commitTransaction()
      }

      this.status = 'COMMITTED'
      this.phase = 'DISPATCH_FLUSH'

      return {
        success: true,
        mutatedEntityIds,
        updatedEntities,
        deletedEntityIds,
        stagedEvents: [...this.stagedEvents],
      }
    } catch (err) {
      if (store.rollbackTransaction) {
        try {
          await store.rollbackTransaction()
        } catch {
          // Ignore secondary rollback error
        }
      } else {
        // Restore pre-commit snapshots to rollback partial writes
        for (const [entityId, snap] of preCommitSnapshots.entries()) {
          if (snap) {
            store.saveEntity(entityId, snap.structId, snap.seq, snap.data)
          } else {
            store.deleteEntity(entityId)
          }
        }
      }

      this.rollback()
      return {
        success: false,
        mutatedEntityIds: [],
        updatedEntities: {},
        deletedEntityIds: [],
        stagedEvents: [],
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // --- Rollback / Abort ---

  public rollback(): void {
    this.stagedMutations.clear()
    this.stagedDeletions.clear()
    this.stagedEdges = []
    this.stagedEvents = []
    this.status = 'ROLLED_BACK'
  }
}
