// oxlint-disable typescript/no-explicit-any
import { Command, CommandBus, type Type } from '@collidor/command'
import type { StructDescriptor } from '@collidor/struct'
import { s } from '@collidor/struct'
import { isComponentRequirement } from '@collidor/struct-command'
import { globalInjector } from '../events/index'

/**
 * Injection Token Symbol for injecting a CommandBus instance.
 */
export const COMMAND_BUS_TOKEN = Symbol.for('@collidor/axon:CommandBus')

/**
 * Injection Token Symbol for injecting a CommandRegistry instance.
 */
export const COMMAND_REGISTRY_TOKEN = Symbol.for('@collidor/axon:CommandRegistry')

export interface CommandDefinition<TData = any, TReturn = any> {
  name: string
  label?: string
  description?: string
  commandClass?: Type<Command<TData, TReturn>> | any
  struct?: any
  resultStruct?: any
  schema?: any
}

export function isAnyComponentRequirement(value: unknown): value is { components: readonly any[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Boolean(
      (value as any)[Symbol.for('@collidor/struct-command/requirement')] ||
      (value as any)[Symbol.for('@collidor/struct-event/requirement')] ||
      (Array.isArray((value as any).components) && (value as any).components.length > 0)
    )
  )
}

/**
 * Helper to dynamically create a typed Command subclass at app-level with associated Struct schema.
 */
export function createAppCommand<
  TData extends Record<string, any> = Record<string, any>,
  TReturn = any,
>(
  name: string,
  struct?: StructDescriptor | { descriptor: StructDescriptor },
  options?: { label?: string; description?: string },
): { commandClass: Type<Command<TData, TReturn>>; definition: CommandDefinition<TData, TReturn> } {
  const cls = class extends Command<TData, TReturn> {
    constructor(data: TData) {
      super(data)
    }
  }
  Object.defineProperty(cls, 'name', { value: name })

  const definition: CommandDefinition<TData, TReturn> = {
    name,
    label: options?.label ?? name,
    description: options?.description,
    commandClass: cls,
    struct,
  }

  return { commandClass: cls, definition }
}

export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>()
  private listeners = new Set<() => void>()

  constructor(initialCommands: CommandDefinition[] = []) {
    initialCommands.forEach((c) => this.register(c))
  }

  public register<TData = any, TReturn = any>(definition: CommandDefinition<TData, TReturn>): void {
    const clsSchema = (definition.commandClass as any)?.schema
    const rawStruct = definition.struct !== undefined ? definition.struct : clsSchema?.input
    const struct =
      rawStruct &&
      typeof rawStruct === 'object' &&
      'descriptor' in rawStruct &&
      !isComponentRequirement(rawStruct)
        ? (rawStruct as { descriptor: StructDescriptor }).descriptor
        : rawStruct

    const resultStruct = definition.resultStruct ?? clsSchema?.output

    let commandClass = definition.commandClass
    if (!commandClass) {
      // Create a named Command subclass for this definition
      const cls = class extends Command<any, any> {
        constructor(data: any) {
          super(data)
        }
      }
      Object.defineProperty(cls, 'name', { value: definition.name })
      commandClass = cls
    }

    this.commands.set(definition.name, {
      ...definition,
      commandClass,
      struct,
      resultStruct,
    })
    this.notifyListeners()
  }

  public unregister(name: string): boolean {
    const deleted = this.commands.delete(name)
    if (deleted) this.notifyListeners()
    return deleted
  }

  public get(name: string): CommandDefinition | undefined {
    return this.commands.get(name)
  }

  public has(name: string): boolean {
    return this.commands.has(name)
  }

  public getAll(): CommandDefinition[] {
    return Array.from(this.commands.values())
  }

  public getNames(): string[] {
    return Array.from(this.commands.keys())
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
        console.warn('Error in CommandRegistry listener:', err)
      }
    })
  }
}

// Standard Entity Command Classes
export class DealDamageCommand extends Command<
  {
    attackerId: string
    targetId: string
    amount: number
    damageType: string
    isCritical?: boolean
  },
  number
> {}

export class HealTargetCommand extends Command<
  { targetId: string; amount: number; sourceId?: string },
  { healed: number; remainingHp: number }
> {}

export class MoveEntityCommand extends Command<
  { entityId: string; toX: number; toY: number; speed?: number },
  { entityId: string; x: number; y: number }
> {}

export class EquipItemCommand extends Command<
  { characterId: string; itemId: string; slot: string },
  { characterId: string; slot: string; equipped: boolean }
> {}

export class AddExperienceCommand extends Command<
  { characterId: string; amount: number },
  { characterId: string; newExp: number; leveledUp: boolean }
> {}

/**
 * Default global Command Registry pre-populated with standard TTRPG commands using Structs for validation.
 */
export const defaultCommandRegistry = new CommandRegistry([
  {
    name: 'DealDamageCommand',
    label: 'Deal Damage',
    description: 'Deals damage from an attacker to a target entity',
    commandClass: DealDamageCommand,
    struct: s.struct({
      attackerId: s.string(),
      targetId: s.string(),
      amount: s.integer().default(10),
      damageType: s.enum(['PHYSICAL', 'FIRE', 'COLD', 'LIGHTNING', 'FORCE']).default('PHYSICAL'),
      isCritical: s.boolean().default(false),
    }),
  },
  {
    name: 'HealTargetCommand',
    label: 'Heal Target',
    description: 'Restores health hitpoints to a target entity',
    commandClass: HealTargetCommand,
    struct: s.struct({
      targetId: s.string(),
      amount: s.integer().default(15),
      sourceId: s.string().optional(),
    }),
  },
  {
    name: 'MoveEntityCommand',
    label: 'Move Entity',
    description: 'Moves an entity to grid target coordinates',
    commandClass: MoveEntityCommand,
    struct: s.struct({
      entityId: s.string(),
      toX: s.number().default(100),
      toY: s.number().default(100),
      speed: s.number().default(30),
    }),
  },
  {
    name: 'EquipItemCommand',
    label: 'Equip Item',
    description: 'Equips an inventory item to a character slot',
    commandClass: EquipItemCommand,
    struct: s.struct({
      characterId: s.string(),
      itemId: s.string(),
      slot: s.enum(['MAIN_HAND', 'OFF_HAND', 'ARMOR', 'RING', 'AMULET']).default('MAIN_HAND'),
    }),
  },
  {
    name: 'AddExperienceCommand',
    label: 'Add Experience',
    description: 'Awards experience points to a character',
    commandClass: AddExperienceCommand,
    struct: s.struct({
      characterId: s.string(),
      amount: s.integer().default(100),
    }),
  },
])

/**
 * Default global CommandBus instance.
 */
export const defaultCommandBus = new CommandBus()

// Register Command services into globalInjector
globalInjector.register(COMMAND_BUS_TOKEN, defaultCommandBus)
globalInjector.register(COMMAND_REGISTRY_TOKEN, defaultCommandRegistry)
