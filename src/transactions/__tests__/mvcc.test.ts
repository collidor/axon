import { describe, it, expect } from 'vitest'
import { MVCCConcurrencyEngine } from '../mvcc'
import { ExecutionTransaction } from '../transaction'
import { createImplicitContext } from '../context'

describe('MVCC Concurrency Control & Stale Command Rejection', () => {
  it('validates matching sequence IDs', () => {
    const valid = MVCCConcurrencyEngine.validate(3, 3)
    expect(valid.valid).toBe(true)
  })

  it('rejects stale sequence IDs with STATE_STALE', () => {
    const invalid = MVCCConcurrencyEngine.validate(1, 2)
    expect(invalid.valid).toBe(false)
    expect(invalid.reason).toBe('STATE_STALE')
    expect(invalid.expectedSequenceId).toBe(1)
    expect(invalid.actualSequenceId).toBe(2)

    const packet = MVCCConcurrencyEngine.createRejectionPacket('goblin_1', 1, 2)
    expect(packet.type).toBe('COMMAND_REJECTED')
    expect(packet.reason).toBe('STATE_STALE')
    expect(packet.targetId).toBe('goblin_1')
  })

  it('aborts transaction commit when target sequence is stale', async () => {
    const store = {
      getEntity: () => ({ id: 'boss_1', sequence_id: 5, data: { hp: 100 } }),
      saveEntity: () => {},
      deleteEntity: () => {},
    }

    const ctx = createImplicitContext()
    const tx = new ExecutionTransaction(ctx)

    // Stage update expecting sequence v4, but store is currently at v5
    tx.stageUpdate('boss_1', { hp: 80 }, 4)

    const result = await tx.commit(store)
    expect(result.success).toBe(false)
    expect(result.error).toContain('MVCC Conflict (STATE_STALE)')
  })
})
