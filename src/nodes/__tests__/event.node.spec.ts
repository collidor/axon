import { describe, it, expect, beforeEach } from 'vitest'
import { EventBus, Injector } from '@collidor/toolkit'
import { s } from '@collidor/struct'
import { createEventNode, EventNodeEngine, deriveEventPortSchemas } from '../event.node'
import { createMathNode } from '../math.node'
import { createDisplayNode } from '../display.node'
import { BaseGraph } from '../../core/base.graph'
import { EVENT_BUS_TOKEN, EVENT_REGISTRY_TOKEN, EventRegistry } from '../../events/index'

describe('EventNode & Dependency Injection Event System', () => {
  let customBus: EventBus
  let customRegistry: EventRegistry
  let injector: Injector

  beforeEach(() => {
    customBus = new EventBus()
    customRegistry = new EventRegistry()
    injector = new Injector()

    injector.register(EVENT_BUS_TOKEN, customBus)
    injector.register(EVENT_REGISTRY_TOKEN, customRegistry)

    // Register test event with typed Struct schema
    customRegistry.register({
      name: 'HERO_ATTACK',
      label: 'Hero Attack',
      description: 'Triggered when a hero performs an attack',
      struct: s.struct({
        heroId: s.string(),
        targetId: s.string(),
        damage: s.integer().default(25),
        isCrit: s.boolean().default(false),
      }),
    })
  })

  it('derives port schemas correctly from Struct descriptors', () => {
    const eventDef = customRegistry.get('HERO_ATTACK')
    expect(eventDef).toBeDefined()

    const { inputs, outputs } = deriveEventPortSchemas(eventDef?.struct, 'listen')

    expect(outputs.trigger).toBe(Boolean)
    expect(outputs.payload).toBe(Object)
    expect(outputs.heroId).toBe(String)
    expect(outputs.targetId).toBe(String)
    expect(outputs.damage).toBe(Number)
    expect(outputs.isCrit).toBe(Boolean)
    expect(inputs.trigger).toBe(Boolean)
  })

  it('resolves injected EventBus and receives live events in listen mode', () => {
    const node = createEventNode(
      {
        initialData: {
          eventName: 'HERO_ATTACK',
          mode: 'listen',
        },
      },
      {
        injector,
      },
    ) as EventNodeEngine

    expect(node.nodeType).toBe('event-node')
    expect(node.data.eventName).toBe('HERO_ATTACK')

    let receivedPayload: unknown = null
    node.subscribe((name, val) => {
      if (name === 'payload') {
        receivedPayload = val
      }
    })

    // Emit event on customBus
    customBus.emitByName('HERO_ATTACK', {
      heroId: 'valeros_1',
      targetId: 'orc_warlord',
      damage: 42,
      isCrit: true,
    })

    expect(receivedPayload).toEqual({
      heroId: 'valeros_1',
      targetId: 'orc_warlord',
      damage: 42,
      isCrit: true,
    })

    expect(node.getOutput('heroId')).toBe('valeros_1')
    expect(node.getOutput('targetId')).toBe('orc_warlord')
    expect(node.getOutput('damage')).toBe(42)
    expect(node.getOutput('isCrit')).toBe(true)
    expect(node.getOutput('trigger')).toBe(true)
  })

  it('emits events to the injected EventBus in emit mode when triggered', () => {
    const node = createEventNode(
      {
        initialData: {
          eventName: 'HERO_ATTACK',
          mode: 'emit',
        },
      },
      {
        injector,
      },
    ) as EventNodeEngine

    let capturedEventData: unknown = null
    const mockClass = { name: 'HERO_ATTACK' } as unknown as new (...args: unknown[]) => unknown
    customBus.on(mockClass as never, (data) => {
      capturedEventData = data
    })

    // Set input values
    node.setInput('heroId', 'merisiel_2')
    node.setInput('targetId', 'goblin_king')
    node.setInput('damage', 18)
    node.setInput('isCrit', false)

    // Trigger emit
    node.setInput('trigger', true)

    expect(capturedEventData).toEqual({
      heroId: 'merisiel_2',
      targetId: 'goblin_king',
      damage: 18,
      isCrit: false,
    })

    expect(node.getOutput('success')).toBe(true)
    expect(node.getOutput('lastEmitted')).toEqual({
      heroId: 'merisiel_2',
      targetId: 'goblin_king',
      damage: 18,
      isCrit: false,
    })
  })

  it('dynamically switches events and updates port contracts', () => {
    customRegistry.register({
      name: 'HEAL_SPELL',
      struct: s.struct({
        clericId: s.string(),
        healAmount: s.integer(),
      }),
    })

    const node = createEventNode(
      {
        initialData: {
          eventName: 'HERO_ATTACK',
          mode: 'listen',
        },
      },
      {
        injector,
      },
    ) as EventNodeEngine

    expect(node.getOutputsSchema()).toHaveProperty('damage')
    expect(node.getOutputsSchema()).toHaveProperty('heroId')

    // Switch event to HEAL_SPELL
    node.setEvent('HEAL_SPELL')

    expect(node.data.eventName).toBe('HEAL_SPELL')
    expect(node.getOutputsSchema()).toHaveProperty('clericId')
    expect(node.getOutputsSchema()).toHaveProperty('healAmount')
    expect(node.getOutputsSchema()).not.toHaveProperty('damage')

    // Emit HEAL_SPELL
    customBus.emitByName('HEAL_SPELL', {
      clericId: 'kyra_3',
      healAmount: 50,
    })

    expect(node.getOutput('clericId')).toBe('kyra_3')
    expect(node.getOutput('healAmount')).toBe(50)
  })

  it('works with default global event registry if none is injected', () => {
    const defaultNode = createEventNode({
      initialData: {
        eventName: 'DAMAGE_DEALT',
        mode: 'listen',
      },
    }) as EventNodeEngine

    expect(defaultNode.data.eventName).toBe('DAMAGE_DEALT')
    expect(defaultNode.getOutputsSchema()).toHaveProperty('attackerId')
    expect(defaultNode.getOutputsSchema()).toHaveProperty('damageType')
    expect(defaultNode.getOutputsSchema()).toHaveProperty('amount')
    expect(defaultNode.getOutputsSchema()).toHaveProperty('isCritical')
  })

  it('automatically propagates emitted events across connected graph nodes', async () => {
    const graph = new BaseGraph()

    const eventNode = createEventNode(
      {
        id: 'event_listen',
        initialData: {
          eventName: 'HERO_ATTACK',
          mode: 'listen',
        },
      },
      { injector },
    )

    const mathNode = createMathNode({
      id: 'math_mult',
      initialData: {
        b: 2,
        operator: 'MULTIPLY',
      },
    })

    const displayNode = createDisplayNode({
      id: 'display_combat',
    })

    graph.addNode(eventNode)
    graph.addNode(mathNode)
    graph.addNode(displayNode)

    graph.addEdge('event_listen:damage', 'math_mult:a')
    graph.addEdge('math_mult:result', 'display_combat:value')

    // Emit HERO_ATTACK event on the bus
    customBus.emitByName('HERO_ATTACK', {
      heroId: 'seoni_4',
      targetId: 'dragon_boss',
      damage: 35,
      isCrit: true,
    })

    await graph.settle()

    // 1. EventNode received output
    expect(eventNode.getOutput('damage')).toBe(35)

    // 2. MathNode received a=35, multiplied by 2 -> result=70
    expect(mathNode.getInput('a')).toBe(35)
    expect(mathNode.getOutput('result')).toBe(70)

    // 3. DisplayNode received value=70
    expect(displayNode.getInput('value')).toBe(70)
  })
})
