// oxlint-disable typescript/no-explicit-any
import { describe, it, expect, beforeEach } from 'vitest'
import { createSqliteTableNode } from '../sqliteTable.node'
import { SQLiteEntityStoreAdapter, SQLiteMemoryDatabase } from '@collidor/struct'

describe('SqliteTableNodeEngine', () => {
  let db: SQLiteMemoryDatabase
  let adapter: SQLiteEntityStoreAdapter

  beforeEach(() => {
    db = new SQLiteMemoryDatabase()
    adapter = new SQLiteEntityStoreAdapter(db)

    adapter.saveEntity('char_1', 'Character', 1, {
      name: 'Valeros',
      class: 'Fighter',
      level: 5,
      hp: 48,
    })
    adapter.saveEntity('char_2', 'Character', 1, {
      name: 'Seoni',
      class: 'Sorcerer',
      level: 5,
      hp: 28,
    })
  })

  it('queries entity by ID from SQLite database adapter', () => {
    const node = createSqliteTableNode(
      {
        initialData: {
          tableName: 'characters',
          structName: 'Character',
          operation: 'GET_BY_ID',
        },
      },
      { sqliteAdapter: adapter },
    )

    node.setInput('characterId', 'char_1')

    const record = node.getOutput('record') as Record<string, any>
    expect(record).toBeDefined()
    expect(record?.name).toBe('Valeros')
    expect(record?.hp).toBe(48)
    expect(node.getOutput('count')).toBe(1)
  })

  it('queries all entities from store or database', () => {
    const node = createSqliteTableNode(
      {
        initialData: {
          tableName: 'characters',
          operation: 'QUERY_ALL',
        },
      },
      { sqliteAdapter: adapter },
    )

    node.setInput('trigger', true)

    const rows = node.getOutput('rows')
    expect(rows).toBeDefined()
    expect(Array.isArray(rows)).toBe(true)
    expect(node.getOutput('total')).toBe(2)
    expect(node.getOutput('page')).toBe(1)
  })

  it('paginates entities with page and pageSize inputs', () => {
    adapter.saveEntity('char_3', 'Character', 1, {
      name: 'Kyra',
      class: 'Cleric',
      level: 5,
      hp: 38,
    })
    adapter.saveEntity('char_4', 'Character', 1, {
      name: 'Ezren',
      class: 'Wizard',
      level: 5,
      hp: 22,
    })

    const node = createSqliteTableNode(
      {
        initialData: {
          tableName: 'characters',
          operation: 'QUERY_ALL',
        },
      },
      { sqliteAdapter: adapter },
    )

    node.setInput('page', 2)
    node.setInput('pageSize', 2)
    node.setInput('trigger', true)

    const rows = node.getOutput('rows') as any[]
    expect(rows).toHaveLength(2)
    expect(node.getOutput('total')).toBe(4)
    expect(node.getOutput('page')).toBe(2)
    expect(node.getOutput('pageSize')).toBe(2)
    expect(node.getOutput('totalPages')).toBe(2)
    expect(node.getOutput('hasNextPage')).toBe(false)
    expect(node.getOutput('hasPrevPage')).toBe(true)
  })
})
