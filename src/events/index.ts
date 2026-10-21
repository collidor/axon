import { Injector, EventBus } from '@collidor/toolkit'
export { Injector, EventBus } from '@collidor/toolkit'
import type { StructDescriptor } from '@collidor/struct'
import { s } from '@collidor/struct'
import { isComponentRequirement } from '@collidor/struct-event'

/**
 * Injection Token Symbol for injecting an EventBus instance.
 */
export const EVENT_BUS_TOKEN = Symbol.for('@collidor/axon:EventBus')

/**
 * Injection Token Symbol for injecting an EventRegistry instance.
 */
export const EVENT_REGISTRY_TOKEN = Symbol.for('@collidor/axon:EventRegistry')

/**
 * Injection Token Symbol for injecting the root Injector.
 */
export const INJECTOR_TOKEN = Symbol.for('@collidor/axon:Injector')

export interface EventDefinition {
  name: string
  label?: string
  description?: string
  struct?: any
  eventClass?: any
  schema?: any
}

export class EventRegistry {
  private events = new Map<string, EventDefinition>()
  private listeners = new Set<() => void>()

  constructor(initialEvents: EventDefinition[] = []) {
    initialEvents.forEach((e) => this.register(e))
  }

  public register(definition: EventDefinition): void {
    const clsSchema = (definition.eventClass as any)?.schema
    const rawStruct = definition.struct !== undefined ? definition.struct : clsSchema
    // Extract descriptor if a StructSchema instance is passed, unless it is a component requirement
    const struct =
      rawStruct &&
      typeof rawStruct === 'object' &&
      'descriptor' in rawStruct &&
      !isComponentRequirement(rawStruct)
        ? rawStruct.descriptor
        : rawStruct

    this.events.set(definition.name, {
      ...definition,
      struct,
      schema: clsSchema ?? definition.schema,
    })
    this.notifyListeners()
  }

  public unregister(name: string): boolean {
    const deleted = this.events.delete(name)
    if (deleted) this.notifyListeners()
    return deleted
  }

  public get(name: string): EventDefinition | undefined {
    return this.events.get(name)
  }

  public has(name: string): boolean {
    return this.events.has(name)
  }

  public getAll(): EventDefinition[] {
    return Array.from(this.events.values())
  }

  public getNames(): string[] {
    return Array.from(this.events.keys())
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch (err) {
        console.warn('Error in EventRegistry listener:', err)
      }
    })
  }
}

/**
 * Default global Event Registry populated with standard entity events.
 */
export const defaultEventRegistry = new EventRegistry([
  {
    name: 'DAMAGE_DEALT',
    label: 'Damage Dealt',
    description: 'Triggered when an entity takes combat damage',
    struct: s.struct({
      attackerId: s.string(),
      targetId: s.string(),
      amount: s.integer().default(10),
      damageType: s.enum(['PHYSICAL', 'FIRE', 'COLD', 'LIGHTNING', 'FORCE']).default('PHYSICAL'),
      isCritical: s.boolean().default(false),
    }),
  },
  {
    name: 'PLAYER_MOVED',
    label: 'Player Moved',
    description: 'Triggered when a player token changes coordinates on the grid',
    struct: s.struct({
      entityId: s.string(),
      fromX: s.number().default(0),
      fromY: s.number().default(0),
      toX: s.number().default(100),
      toY: s.number().default(100),
      speed: s.number().default(30),
    }),
  },
  {
    name: 'SPELL_CAST',
    label: 'Spell Cast',
    description: 'Triggered when a spell or ability is activated',
    struct: s.struct({
      casterId: s.string(),
      spellName: s.string().default('Fireball'),
      spellLevel: s.integer().default(3),
      manaCost: s.integer().default(25),
      targetId: s.string().optional(),
    }),
  },
  {
    name: 'ITEM_EQUIPPED',
    label: 'Item Equipped',
    description: 'Triggered when an entity equips an inventory item',
    struct: s.struct({
      characterId: s.string(),
      itemId: s.string(),
      slot: s.enum(['MAIN_HAND', 'OFF_HAND', 'ARMOR', 'RING', 'AMULET']).default('MAIN_HAND'),
      itemLevel: s.integer().default(1),
    }),
  },
  {
    name: 'TURN_STARTED',
    label: 'Turn Started',
    description: 'Triggered at the start of a combat turn',
    struct: s.struct({
      roundNumber: s.integer().default(1),
      activeActorId: s.string(),
      initiativeScore: s.number().default(15),
    }),
  },
])

/**
 * Default global EventBus instance.
 */
export const defaultEventBus = new EventBus()

/**
 * Default root Injector pre-configured with default EventBus and EventRegistry.
 */
export const globalInjector = new Injector()
globalInjector.register(EVENT_BUS_TOKEN, defaultEventBus)
globalInjector.register(EVENT_REGISTRY_TOKEN, defaultEventRegistry)
globalInjector.register(INJECTOR_TOKEN, globalInjector)
