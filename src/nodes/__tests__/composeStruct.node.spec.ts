import { describe, it, expect } from 'vitest'
import { createComposeStructNode } from '../composeStruct.node'
import { NODE_TYPES } from '../nodes.constants'

describe('ComposeStructNodeEngine', () => {
  it('instantiates with correct nodeType and default outputs', () => {
    const node = createComposeStructNode({
      initialData: {
        structName: 'HealTargetPayload',
        fields: [
          { name: 'targetId', type: 'string' },
          { name: 'amount', type: 'number', default: 15 },
          { name: 'sourceId', type: 'string', optional: true },
        ],
      },
    })

    expect(node.nodeType).toBe(NODE_TYPES.COMPOSE_STRUCT)
    expect(node.outputNames).toContain('payload')
    expect(node.outputNames).toContain('output')
    expect(node.outputNames).toContain('result')
  })

  it('composes struct from fallback initial data', () => {
    const node = createComposeStructNode({
      initialData: {
        structName: 'HealTargetPayload',
        targetId: 'char_123',
        amount: 25,
      },
    })

    const payload = node.getOutput('payload') as Record<string, unknown>
    expect(payload).toEqual({
      targetId: 'char_123',
      amount: 25,
    })
  })

  it('overrides static fields when port inputs arrive', () => {
    const node = createComposeStructNode({
      initialData: {
        structName: 'HealTargetPayload',
        targetId: 'char_default',
        amount: 10,
      },
      inputs: {
        targetId: null,
        amount: null,
        sourceId: null,
      },
    })

    node.setInput('targetId', 'char_hero_99')
    node.setInput('amount', 50)
    node.setInput('sourceId', 'cleric_1')

    const payload = node.getOutput('payload') as Record<string, unknown>
    expect(payload).toEqual({
      targetId: 'char_hero_99',
      amount: 50,
      sourceId: 'cleric_1',
    })
    expect(node.getOutput('output')).toEqual(payload)
  })

  it('integrates with @collidor/struct schema and validates output', async () => {
    const { s } = await import('@collidor/struct')
    const Position = s.struct('Position', {
      x: s.number().min(0),
      y: s.number().min(0),
    })

    const node = createComposeStructNode({
      initialData: {
        struct: Position,
        x: 10,
        y: 20,
      },
    })

    expect(node.getOutput('valid')).toBe(true)
    expect(node.getOutput('errors')).toBeNull()
    expect(node.getOutput('payload')).toEqual({ x: 10, y: 20 })

    // Provide invalid data: x is negative
    node.setInput('x', -5)
    expect(node.getOutput('valid')).toBe(false)
    expect(node.getOutput('errors')).not.toBeNull()
  })
})
