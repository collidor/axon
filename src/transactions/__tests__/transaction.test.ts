import { describe, it, expect, beforeEach } from 'vitest'
import { ExecutionTransaction, type EntityStoreAdapter } from '../transaction'
import { createImplicitContext } from '../context'

class MockEntityStore implements EntityStoreAdapter {
  public entities = new Map<
    string,
    { id: string; struct_id: string; sequence_id: number; data: Record<string, unknown> }
  >()
  public edges: {
    sourceId: string
    relationName: string
    targetId: string
    metadata?: Record<string, unknown>
  }[] = []

  getEntity(id: string) {
    const e = this.entities.get(id)
    if (!e) return undefined
    return { id: e.id, sequence_id: e.sequence_id, data: { ...e.data } }
  }

  saveEntity(id: string, structId: string, sequenceId: number, data: Record<string, unknown>) {
    this.entities.set(id, { id, struct_id: structId, sequence_id: sequenceId, data })
  }

  deleteEntity(id: string) {
    this.entities.delete(id)
  }

  linkEdge(
    sourceId: string,
    relationName: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ) {
    this.edges.push({ sourceId, relationName, targetId, metadata })
  }

  unlinkEdge(sourceId: string, relationName: string, targetId: string) {
    this.edges = this.edges.filter(
      (e) =>
        !(e.sourceId === sourceId && e.relationName === relationName && e.targetId === targetId),
    )
  }
}

describe('3-Phase Execution Transaction Pipeline', () => {
  let store: MockEntityStore

  beforeEach(() => {
    store = new MockEntityStore()
    store.saveEntity('hero_1', 'character', 1, { hp: 20, max_hp: 20, name: 'Valeros' })
  })

  it('stages mutations in Phase 1 (COW) without modifying underlying store before commit', async () => {
    const ctx = createImplicitContext()
    const tx = new ExecutionTransaction(ctx)

    tx.stageUpdate('hero_1', { hp: 15 }, 1)

    // Verify copy-on-write staged state
    const stagedState = tx.getStagedState('hero_1', store.getEntity('hero_1')?.data)
    expect(stagedState).toEqual({ hp: 15, max_hp: 20, name: 'Valeros' })

    // Verify underlying store remains untouched during Phase 1
    expect(store.getEntity('hero_1')?.data.hp).toBe(20)

    // Phase 2 Commit
    const result = await tx.commit(store)
    expect(result.success).toBe(true)
    expect(result.updatedEntities.hero_1.sequence_id).toBe(2)
    expect(result.updatedEntities.hero_1.data.hp).toBe(15)

    // Verify underlying store was atomically updated and sequence_id incremented
    expect(store.getEntity('hero_1')?.sequence_id).toBe(2)
    expect(store.getEntity('hero_1')?.data.hp).toBe(15)
  })

  it('discards staged buffer cleanly upon rollback without corrupting store', async () => {
    const ctx = createImplicitContext()
    const tx = new ExecutionTransaction(ctx)

    tx.stageUpdate('hero_1', { hp: 0 })
    tx.stageDelete('hero_1')
    tx.rollback()

    expect(tx.status).toBe('ROLLED_BACK')
    expect(store.getEntity('hero_1')).toBeDefined()
    expect(store.getEntity('hero_1')?.data.hp).toBe(20)
  })

  it('restores entity snapshots if an exception throws mid-commit', async () => {
    store.saveEntity('hero_2', 'character', 1, { hp: 30, name: 'Merisiel' })

    const ctx = createImplicitContext()
    const tx = new ExecutionTransaction(ctx)

    tx.stageUpdate('hero_1', { hp: 10 })
    tx.stageUpdate('hero_2', { hp: 5 })

    // Simulate store throwing during save of hero_2
    const originalSave = store.saveEntity.bind(store)
    let callCount = 0
    store.saveEntity = (id, structId, seq, data) => {
      callCount++
      if (callCount === 2) {
        throw new Error('Disk IO failure')
      }
      originalSave(id, structId, seq, data)
    }

    const result = await tx.commit(store)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Disk IO failure')

    // Verify hero_1 was rolled back to its snapshot state rather than staying partially committed
    expect(store.getEntity('hero_1')?.data.hp).toBe(20)
    expect(store.getEntity('hero_2')?.data.hp).toBe(30)
  })
})
