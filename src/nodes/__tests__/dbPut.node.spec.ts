// oxlint-disable typescript/no-explicit-any
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createDbPutNode } from '../dbPut.node'
import { SQLiteEntityStoreAdapter, SQLiteMemoryDatabase } from '@collidor/struct'

describe('DbPutNodeEngine', () => {
  let db: SQLiteMemoryDatabase
  let adapter: SQLiteEntityStoreAdapter

  beforeEach(() => {
    db = new SQLiteMemoryDatabase()
    adapter = new SQLiteEntityStoreAdapter(db)
  })

  it('initializes with default inputs, outputs, and idle state', () => {
    const node = createDbPutNode({
      initialData: {
        tableName: 'characters',
        structName: 'Character',
      },
    })

    expect(node.getOutput('status')).toBe('idle')
    expect(node.getOutput('progress')).toBe(0)
    expect(node.getOutput('result')).toBeNull()
    expect(node.getOutput('error')).toBeNull()
  })

  it('persists a new entity to SQLite adapter on executePut', async () => {
    const node = createDbPutNode(
      {
        initialData: {
          tableName: 'characters',
          structName: 'Character',
        },
      },
      { sqliteAdapter: adapter },
    )

    node.setInput('record', {
      id: 'char_101',
      name: 'Kyra the Cleric',
      hp: 35,
      maxHp: 35,
    })

    const result = await node.executePut()

    expect(result.success).toBe(true)
    expect(result.record.name).toBe('Kyra the Cleric')
    expect(node.getOutput('status')).toBe('success')
    expect(node.getOutput('progress')).toBe(100)
    expect(node.getOutput('onSuccess')).toBe(true)

    // Verify entity in SQLite database
    const fetched = adapter.getEntity('char_101')
    expect(fetched).toBeDefined()
    expect(fetched?.data.name).toBe('Kyra the Cleric')
    expect(fetched?.data.hp).toBe(35)
  })

  it('updates an existing record (upsert) in SQLite adapter', async () => {
    adapter.saveEntity('char_202', 'Character', 1, {
      name: 'Old Name',
      hp: 10,
    })

    const node = createDbPutNode(
      {
        initialData: {
          tableName: 'characters',
          structName: 'Character',
        },
      },
      { sqliteAdapter: adapter },
    )

    node.setInput('record', {
      id: 'char_202',
      name: 'Updated Name',
      hp: 50,
    })

    const result = await node.executePut()
    expect(result.success).toBe(true)
    expect(result.record.name).toBe('Updated Name')

    const updated = adapter.getEntity('char_202')
    expect(updated?.data.name).toBe('Updated Name')
    expect(updated?.data.hp).toBe(50)
  })

  it('handles custom runtime stores and pinia/map stores', async () => {
    const characterStore = {
      data: new Map<string, any>(),
      upsert: vi.fn<(rec: any) => any>((rec: any) => {
        characterStore.data.set(String(rec.id), rec)
        return rec
      }),
    }

    const mockRuntime = {
      getStore: vi.fn<(name: string) => any>((name: string) =>
        name === 'characters' ? characterStore : null,
      ),
    }

    const node = createDbPutNode(
      {
        initialData: {
          tableName: 'characters',
        },
      },
      { runtime: mockRuntime },
    )

    node.setInput('record', {
      id: 'c_303',
      name: 'Ezren the Wizard',
      spellSlots: 4,
    })

    const result = await node.executePut()
    expect(result.success).toBe(true)
    expect(characterStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c_303', name: 'Ezren the Wizard' }),
    )
  })

  it('commits draft when draftId is specified and draftStore is present', async () => {
    const mockDraftStore = {
      commitDraft: vi.fn<(id: string) => void>(),
    }

    const node = createDbPutNode(
      {
        initialData: {
          tableName: 'characters',
        },
      },
      { sqliteAdapter: adapter, draftStore: mockDraftStore },
    )

    node.setInput('id', 'char_404')
    node.setInput('draftId', 'draft_hero_form')
    node.setInput('record', { name: 'Draft Hero' })

    await node.executePut()

    expect(mockDraftStore.commitDraft).toHaveBeenCalledWith('draft_hero_form')
  })

  it('cascades relational array entities if cascadeRelations is true', async () => {
    const node = createDbPutNode(
      {
        initialData: {
          tableName: 'characters',
          structName: 'Character',
          cascadeRelations: true,
        },
      },
      { sqliteAdapter: adapter },
    )

    node.setInput('record', {
      id: 'char_505',
      name: 'Fighter with Items',
      items: [
        { id: 'item_1', name: 'Longsword +1', damage: '1d8' },
        { id: 'item_2', name: 'Shield', acBonus: 2 },
      ],
    })

    const result = await node.executePut()
    expect(result.success).toBe(true)

    // Check parent entity
    const charEntity = adapter.getEntity('char_505')
    expect(charEntity).toBeDefined()

    // Check child entities
    const item1 = adapter.getEntity('item_1')
    expect(item1).toBeDefined()
    expect(item1?.data.name).toBe('Longsword +1')
    expect(item1?.data.parent_id).toBe('char_505')

    const item2 = adapter.getEntity('item_2')
    expect(item2).toBeDefined()
    expect(item2?.data.name).toBe('Shield')
  })

  it('dispatches lifecycle events to eventBus', async () => {
    const mockEventBus = {
      emit: vi.fn<(event: string, payload: any) => void>(),
    }

    const node = createDbPutNode(
      {
        initialData: {
          tableName: 'characters',
        },
      },
      { sqliteAdapter: adapter, eventBus: mockEventBus },
    )

    node.setInput('record', { id: 'char_606', name: 'Event Test' })
    await node.executePut()

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'mutation:characters:start',
      expect.objectContaining({ targetTable: 'characters', progress: 0 }),
    )
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'mutation:characters:progress',
      expect.objectContaining({ targetTable: 'characters', entityId: 'char_606', progress: 50 }),
    )
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'mutation:characters:success',
      expect.objectContaining({ targetTable: 'characters', entityId: 'char_606', progress: 100 }),
    )
  })

  it('triggers executePut automatically when trigger port is set to true', async () => {
    const node = createDbPutNode(
      {
        initialData: {
          tableName: 'characters',
        },
      },
      { sqliteAdapter: adapter },
    )

    node.setInput('record', { id: 'char_707', name: 'Auto Trigger Hero' })
    node.setInput('trigger', true)

    // Allow execution
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(node.getOutput('status')).toBe('success')
    expect(adapter.getEntity('char_707')?.data.name).toBe('Auto Trigger Hero')
  })
})
