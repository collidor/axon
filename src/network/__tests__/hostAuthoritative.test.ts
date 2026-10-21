import { describe, it, expect, beforeEach } from 'vitest'
import { HostAuthorityEngine, type PlayerCommandPacket } from '../hostAuthoritative'
import { SessionIdentityManager } from '../identity'
import type { EntityStoreAdapter } from '../../transactions/transaction'

class MockStore implements EntityStoreAdapter {
  public entities = new Map<
    string,
    { id: string; struct_id: string; sequence_id: number; data: Record<string, unknown> }
  >()

  getEntity(id: string) {
    const e = this.entities.get(id)
    return e ? { id: e.id, sequence_id: e.sequence_id, data: { ...e.data } } : undefined
  }

  saveEntity(id: string, structId: string, sequenceId: number, data: Record<string, unknown>) {
    this.entities.set(id, { id, struct_id: structId, sequence_id: sequenceId, data })
  }

  deleteEntity(id: string) {
    this.entities.delete(id)
  }
}

describe('Host Authority Engine & HOST_ONLY Field Redaction', () => {
  let store: MockStore
  let identity: SessionIdentityManager
  let hostEngine: HostAuthorityEngine

  beforeEach(() => {
    store = new MockStore()
    identity = new SessionIdentityManager()
    hostEngine = new HostAuthorityEngine(store, identity)

    // Setup entity and ownership
    store.saveEntity('goblin_king', 'monster_boss', 1, {
      name: 'Gorg the Ruthless',
      hp: 100,
      gm_secret_weakness: 'Vulnerable to silver bell chime',
      gm_hidden_loot_code: 'GOLD_9999',
    })

    hostEngine.registerHostOnlyFields('monster_boss', ['gm_secret_weakness', 'gm_hidden_loot_code'])
  })

  it('processes authorized player command and replicates updated state', async () => {
    // Player controls character
    identity.setEntityOwner('hero_fighter', 'user_alice')

    const cmd: PlayerCommandPacket = {
      type: 'PLAYER_COMMAND',
      commandId: 'cmd_1',
      userUuid: 'user_alice',
      actorId: 'hero_fighter',
      targetId: 'goblin_king',
      action: 'ATTACK',
      payload: { damage: 25 },
    }

    const res = await hostEngine.handlePlayerCommand(cmd, (tx) => {
      tx.stageUpdate('goblin_king', { hp: 75 }, 1)
    })

    expect(res.success).toBe(true)
    expect(res.replicationBundle).toBeDefined()
    expect(res.replicationBundle?.mutatedEntities.goblin_king.data.hp).toBe(75)
  })

  it('redacts HOST_ONLY fields from StateReplicationBundle for non-host peers', () => {
    const rawBundle = {
      type: 'STATE_REPLICATION' as const,
      bundleId: 'rep_1',
      timestamp: Date.now(),
      schemaVersion: 1,
      mutatedEntities: {
        goblin_king: {
          struct_id: 'monster_boss',
          sequence_id: 2,
          data: {
            name: 'Gorg the Ruthless',
            hp: 75,
            gm_secret_weakness: 'Vulnerable to silver bell chime',
            gm_hidden_loot_code: 'GOLD_9999',
          },
        },
      },
      deletedEntityIds: [],
      events: [],
    }

    const redacted = hostEngine.redactBundleForPeer(rawBundle)
    const goblinData = redacted.mutatedEntities.goblin_king.data

    expect(goblinData.name).toBe('Gorg the Ruthless')
    expect(goblinData.hp).toBe(75)
    expect(goblinData.gm_secret_weakness).toBeUndefined()
    expect(goblinData.gm_hidden_loot_code).toBeUndefined()
  })

  it('rejects unauthorized command if user does not own actor', async () => {
    identity.setEntityOwner('hero_paladin', 'user_bob')

    const cmd: PlayerCommandPacket = {
      type: 'PLAYER_COMMAND',
      commandId: 'cmd_hack',
      userUuid: 'user_eve', // Eve tries to command Bob's Paladin
      actorId: 'hero_paladin',
      action: 'DROP_WEAPON',
      payload: {},
    }

    const res = await hostEngine.handlePlayerCommand(cmd, () => {})
    expect(res.success).toBe(false)
    expect(res.error).toContain('Permission Denied')
  })
})
