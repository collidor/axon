import { describe, it, expect } from 'vitest'
import { createUmlTableNode } from '../umlTable.node'

describe('UmlTableNodeEngine', () => {
  it('initializes with default table columns and ports', () => {
    const node = createUmlTableNode({
      initialData: {
        tableName: 'monsters',
        displayName: 'Bestiary Monster',
        storageClass: 'sqlite_table',
        columns: [
          { name: 'id', type: 'string', isPrimary: true, isNullable: false },
          { name: 'name', type: 'string', isNullable: false },
          { name: 'cr', type: 'number', defaultValue: 1 },
        ],
      },
    })

    expect(node.data.tableName).toBe('monsters')
    expect(node.data.columns.length).toBe(3)
    expect(node.inputNames).toContain('id')
    expect(node.outputNames).toContain('name')
  })

  it('adds and removes columns dynamically with port synchronization', () => {
    const node = createUmlTableNode({
      initialData: {
        tableName: 'characters',
        columns: [{ name: 'id', type: 'string', isPrimary: true }],
      },
    })

    expect(node.data.columns.length).toBe(1)

    node.addColumn({
      name: 'armor_class',
      type: 'integer',
      defaultValue: 10,
    })

    expect(node.data.columns.length).toBe(2)
    expect(node.inputNames).toContain('armor_class')
    expect(node.outputNames).toContain('armor_class')

    node.removeColumn('armor_class')
    expect(node.data.columns.length).toBe(1)
    expect(node.inputNames).not.toContain('armor_class')
    expect(node.outputNames).not.toContain('armor_class')
  })
})

