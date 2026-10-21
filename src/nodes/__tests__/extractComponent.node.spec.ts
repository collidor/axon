import { describe, it, expect } from 'vitest'
import { createExtractComponentNode } from '../extractComponent.node'
import { NODE_TYPES } from '../nodes.constants'
import { s } from '@collidor/struct'

describe('ExtractComponentNodeEngine', () => {
  const Position = s.struct('Position', {
    x: s.number(),
    y: s.number(),
  })

  it('instantiates with correct nodeType and default ports', () => {
    const node = createExtractComponentNode({
      initialData: {
        componentName: 'Position',
        struct: Position,
      },
    })

    expect(node.nodeType).toBe(NODE_TYPES.EXTRACT_COMPONENT)
    expect(node.outputNames).toContain('component')
    expect(node.outputNames).toContain('hasComponent')
    expect(node.outputNames).toContain('entity')
    expect(node.outputNames).toContain('x')
    expect(node.outputNames).toContain('y')
  })

  it('extracts named component from game object', () => {
    const node = createExtractComponentNode({
      initialData: {
        componentName: 'Position',
        struct: Position,
      },
    })

    const gameObject = {
      id: 'hero_1',
      name: 'Arthur',
      position: { x: 120, y: 340 },
      health: { current: 100, max: 100 },
    }

    node.setInput('entity', gameObject)

    expect(node.getOutput('hasComponent')).toBe(true)
    expect(node.getOutput('component')).toEqual({ x: 120, y: 340 })
    expect(node.getOutput('x')).toBe(120)
    expect(node.getOutput('y')).toBe(340)
    expect(node.getOutput('entity')).toBe(gameObject)
  })

  it('handles missing component gracefully', () => {
    const node = createExtractComponentNode({
      initialData: {
        componentName: 'Velocity',
      },
    })

    const gameObject = {
      id: 'rock_1',
      position: { x: 0, y: 0 },
    }

    node.setInput('entity', gameObject)

    expect(node.getOutput('hasComponent')).toBe(false)
    expect(node.getOutput('component')).toBeNull()
  })

  it('supports dynamically switching componentName', () => {
    const node = createExtractComponentNode()

    const gameObject = {
      id: 'entity_9',
      position: { x: 10, y: 20 },
      combatant: { attack: 15, defense: 8 },
    }

    node.setInput('entity', gameObject)
    node.setInput('componentName', 'Combatant')

    expect(node.getOutput('hasComponent')).toBe(true)
    expect(node.getOutput('component')).toEqual({ attack: 15, defense: 8 })
  })
})
