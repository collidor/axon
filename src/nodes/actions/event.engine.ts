// oxlint-disable typescript/no-explicit-any
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import {
  EVENT_BUS_TOKEN,
  EVENT_REGISTRY_TOKEN,
  globalInjector,
  defaultEventBus,
  defaultEventRegistry,
  type EventRegistry,
  type EventDefinition,
} from '../../events/index'
import type { EventBus, Injector } from '@collidor/toolkit'
import type { StructDescriptor, TypeDescriptor } from '@collidor/struct'
import { getComponentName } from '@collidor/struct'
import { isAnyComponentRequirement } from '../../commands/commandRegistry'

const lowerFirst = (str: string): string =>
  str.length > 0 ? str.charAt(0).toLowerCase() + str.slice(1) : str

export type EventNodeMode = 'listen' | 'emit'

export interface EventNodeData {
  eventName?: string
  mode?: EventNodeMode
  payload?: Record<string, unknown>
  [key: string]: unknown
}

export interface EventNodeGlobalData {
  eventBus?: EventBus
  eventRegistry?: EventRegistry
  injector?: Injector
  [key: string]: unknown
}

/**
 * Maps a Struct field type descriptor to a JavaScript constructor for Axon ports.
 */
export function descriptorToConstructor(desc: TypeDescriptor): unknown {
  switch (desc.kind) {
    case 'integer':
    case 'number':
      return Number
    case 'string':
    case 'enum':
    case 'literal':
      return String
    case 'boolean':
      return Boolean
    case 'array':
      return Array
    case 'bigint':
      return BigInt
    case 'date':
      return Date
    case 'struct':
    case 'record':
    case 'union':
    case 'any':
    default:
      return Object
  }
}

/**
 * Derives Axon input/output schemas based on the selected event's StructDescriptor and mode.
 */
export function deriveEventPortSchemas(
  schemaOrDescriptor?: any,
  mode: EventNodeMode = 'listen',
): { inputs: Record<string, unknown>; outputs: Record<string, unknown> } {
  const schema =
    schemaOrDescriptor?.schema ??
    schemaOrDescriptor?.eventClass?.schema ??
    schemaOrDescriptor?.struct ??
    schemaOrDescriptor

  if (isAnyComponentRequirement(schema)) {
    if (mode === 'listen') {
      const outputs: Record<string, unknown> = {
        trigger: Boolean,
        payload: Object,
        entity: Object,
      }
      for (const comp of schema.components) {
        let compName = ''
        try {
          compName = getComponentName(comp)
        } catch {
          compName = 'component'
        }
        const compKey = lowerFirst(compName)
        outputs[compKey] = Object

        const compDesc = (comp as any).descriptor
        if (compDesc?.fields) {
          for (const [key, fieldDesc] of Object.entries(compDesc.fields)) {
            if (schema.components.length === 1) {
              outputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
            } else {
              outputs[`${compKey}_${key}`] = descriptorToConstructor(fieldDesc as TypeDescriptor)
            }
          }
        }
      }
      return {
        inputs: { trigger: Boolean },
        outputs,
      }
    } else {
      const inputs: Record<string, unknown> = {
        trigger: Boolean,
        payload: Object,
        entity: Object,
      }
      for (const comp of schema.components) {
        let compName = ''
        try {
          compName = getComponentName(comp)
        } catch {
          compName = 'component'
        }
        const compKey = lowerFirst(compName)
        inputs[compKey] = Object

        const compDesc = (comp as any).descriptor
        if (compDesc?.fields) {
          for (const [key, fieldDesc] of Object.entries(compDesc.fields)) {
            if (schema.components.length === 1) {
              inputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
            } else {
              inputs[`${compKey}_${key}`] = descriptorToConstructor(fieldDesc as TypeDescriptor)
            }
          }
        }
      }
      return {
        inputs,
        outputs: {
          success: Boolean,
          lastEmitted: Object,
        },
      }
    }
  }

  const descriptor =
    schema && 'fields' in schema
      ? schema
      : schema && 'descriptor' in schema
        ? schema.descriptor
        : undefined

  if (mode === 'listen') {
    const outputs: Record<string, unknown> = {
      trigger: Boolean,
      payload: Object,
    }

    if (descriptor?.fields) {
      for (const [key, fieldDesc] of Object.entries(descriptor.fields)) {
        outputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
      }
    }

    return {
      inputs: {
        trigger: Boolean,
      },
      outputs,
    }
  } else {
    // Mode is 'emit'
    const inputs: Record<string, unknown> = {
      trigger: Boolean,
      payload: Object,
    }

    if (descriptor?.fields) {
      for (const [key, fieldDesc] of Object.entries(descriptor.fields)) {
        inputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
      }
    }

    return {
      inputs,
      outputs: {
        success: Boolean,
        lastEmitted: Object,
      },
    }
  }
}

export class EventNodeEngine extends BaseNode<any, any, EventNodeData, EventNodeGlobalData> {
  private activeUnsubscribe: (() => void) | null = null
  private currentEventName: string | null = null
  public eventDef?: EventDefinition

  constructor(
    options: Partial<NodeInitOptions<any, any, EventNodeData, EventNodeGlobalData>> = {},
    globalData?: EventNodeGlobalData,
  ) {
    const initialData: EventNodeData = {
      eventName: options.initialData?.eventName ?? 'DAMAGE_DEALT',
      mode: options.initialData?.mode ?? 'listen',
      payload: options.initialData?.payload ?? {},
      ...options.initialData,
    }

    const registry = EventNodeEngine.resolveEventRegistry(globalData)
    const eventDef = initialData.eventName ? registry?.get(initialData.eventName) : undefined
    const { inputs, outputs } = deriveEventPortSchemas(
      eventDef,
      initialData.mode,
    )

    super(
      {
        nodeType: NODE_TYPES.EVENT,
        inputs: options.inputs ?? inputs,
        outputs: options.outputs ?? outputs,
        initialData,
        onInit: options.onInit,
        onDestroy: (ctx) => {
          if (options.onDestroy) options.onDestroy(ctx)
        },
        onInputChange: (name, value, ctx) => {
          if (ctx.data.mode === 'emit' && name === 'trigger' && Boolean(value)) {
            ;(ctx.node as EventNodeEngine).emitEventToBus(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
        ...options,
      },
      globalData,
    )

    this.eventDef = eventDef
    this.bindEventBusSubscription()
  }

  public static resolveEventBus(globalData?: EventNodeGlobalData): EventBus {
    if (globalData?.eventBus) return globalData.eventBus
    if (globalData?.injector) {
      const bus = globalData.injector.safeGet(EVENT_BUS_TOKEN)
      if (bus) return bus as EventBus
    }
    const globalBus = globalInjector.safeGet(EVENT_BUS_TOKEN)
    return (globalBus as EventBus) ?? defaultEventBus
  }

  public static resolveEventRegistry(globalData?: EventNodeGlobalData): EventRegistry {
    if (globalData?.eventRegistry) return globalData.eventRegistry
    if (globalData?.injector) {
      const reg = globalData.injector.safeGet(EVENT_REGISTRY_TOKEN)
      if (reg) return reg as EventRegistry
    }
    const globalReg = globalInjector.safeGet(EVENT_REGISTRY_TOKEN)
    return (globalReg as EventRegistry) ?? defaultEventRegistry
  }

  public setEvent(eventName: string): void {
    this.data.eventName = eventName
    const registry = EventNodeEngine.resolveEventRegistry(this.globalData)
    const eventDef = registry.get(eventName)
    this.eventDef = eventDef

    const { inputs, outputs } = deriveEventPortSchemas(
      eventDef,
      this.data.mode,
    )

    // Reconfigure ports dynamically based on the picked Struct schema
    this.reconfigurePorts(inputs, outputs)

    // Re-bind subscription to new event channel
    this.unbindEventBusSubscription()
    this.bindEventBusSubscription()
  }

  public setMode(mode: EventNodeMode): void {
    this.data.mode = mode
    const registry = EventNodeEngine.resolveEventRegistry(this.globalData)
    const eventDef = this.data.eventName ? registry.get(this.data.eventName) : undefined
    this.eventDef = eventDef

    const { inputs, outputs } = deriveEventPortSchemas(
      eventDef,
      mode,
    )
    this.reconfigurePorts(inputs, outputs)

    this.unbindEventBusSubscription()
    if (mode === 'listen') {
      this.bindEventBusSubscription()
    }
  }

  private reconfigurePorts(
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>,
  ): void {
    const currentInputsSchema = this.getInputsSchema()
    const currentOutputsSchema = this.getOutputsSchema()

    for (const key of Object.keys(currentInputsSchema)) {
      if (!(key in inputs)) {
        this.removeInput(key)
      }
    }
    for (const [key, type] of Object.entries(inputs)) {
      if (!(key in currentInputsSchema)) {
        this.addInput(key, type)
      }
    }

    for (const key of Object.keys(currentOutputsSchema)) {
      if (!(key in outputs)) {
        this.removeOutput(key)
      }
    }
    for (const [key, type] of Object.entries(outputs)) {
      if (!(key in currentOutputsSchema)) {
        this.addOutput(key, type)
      }
    }
  }

  public emitEventToBus(ctx?: any): void {
    const eventName = this.data.eventName
    if (!eventName) return

    const bus = EventNodeEngine.resolveEventBus(this.globalData)
    const contextInputs = ctx?.inputs ?? this.getInputs()

    const registry = EventNodeEngine.resolveEventRegistry(this.globalData)
    const eventDef = registry.get(eventName)
    const rawSchema = eventDef?.eventClass?.schema ?? eventDef?.struct

    let emittedPayload: any

    if (isAnyComponentRequirement(rawSchema)) {
      let entity: Record<string, unknown> = {}
      if (contextInputs.entity && typeof contextInputs.entity === 'object') {
        entity = { ...(contextInputs.entity as Record<string, unknown>) }
      } else if (contextInputs.payload && typeof contextInputs.payload === 'object') {
        entity = { ...(contextInputs.payload as Record<string, unknown>) }
      }

      for (const comp of rawSchema.components) {
        let compName = ''
        try {
          compName = getComponentName(comp)
        } catch {
          compName = 'component'
        }
        const compKey = lowerFirst(compName)
        if (contextInputs[compKey] !== undefined) {
          entity[compKey] = contextInputs[compKey]
        } else if (contextInputs[compName] !== undefined) {
          entity[compName] = contextInputs[compName]
        } else {
          const compDesc = (comp as any).descriptor
          if (compDesc?.fields) {
            const compObj: Record<string, unknown> =
              typeof entity[compKey] === 'object' && entity[compKey] !== null
                ? { ...(entity[compKey] as Record<string, unknown>) }
                : {}
            let hasField = false
            for (const fKey of Object.keys(compDesc.fields)) {
              if (rawSchema.components.length === 1 && contextInputs[fKey] !== undefined) {
                compObj[fKey] = contextInputs[fKey]
                hasField = true
              }
              const prefixed = `${compKey}_${fKey}`
              if (contextInputs[prefixed] !== undefined) {
                compObj[fKey] = contextInputs[prefixed]
                hasField = true
              }
            }
            if (hasField) {
              entity[compKey] = compObj
            }
          }
        }
      }

      if (this.data.payload) {
        entity = { ...this.data.payload, ...entity }
      }

      if (eventDef?.eventClass) {
        const evInstance = new eventDef.eventClass(entity)
        if ((bus as any).publish) {
          (bus as any).publish(evInstance)
        } else if ((bus as any).emit) {
          (bus as any).emit(evInstance)
        } else {
          bus.emitByName(eventName, evInstance.data ?? entity)
        }
        emittedPayload = evInstance.data ?? entity
      } else {
        emittedPayload = entity
        bus.emitByName(eventName, emittedPayload)
      }
    } else {
      const payload: Record<string, unknown> = {
        ...this.data.payload,
        ...(typeof contextInputs.payload === 'object' && contextInputs.payload !== null
          ? contextInputs.payload
          : {}),
      }

      const structDesc =
        rawSchema && 'fields' in rawSchema
          ? rawSchema
          : rawSchema && 'descriptor' in rawSchema
            ? rawSchema.descriptor
            : undefined

      if (structDesc?.fields) {
        for (const key of Object.keys(structDesc.fields)) {
          if (contextInputs[key] !== undefined) {
            payload[key] = contextInputs[key]
          }
        }
      }

      for (const [k, v] of Object.entries(contextInputs)) {
        if (
          k !== 'trigger' &&
          k !== 'payload' &&
          k !== 'entity' &&
          v !== undefined
        ) {
          payload[k] = v
        }
      }

      if (eventDef?.eventClass) {
        const evInstance = new eventDef.eventClass(payload)
        if ((bus as any).publish) {
          (bus as any).publish(evInstance)
        } else if ((bus as any).emit) {
          (bus as any).emit(evInstance)
        } else {
          bus.emitByName(eventName, evInstance.data ?? payload)
        }
        emittedPayload = evInstance.data ?? payload
      } else {
        emittedPayload = payload
        bus.emitByName(eventName, emittedPayload)
      }
    }

    this.emitOutput('success', true)
    this.emitOutput('lastEmitted', emittedPayload)
  }

  public testFireIncoming(data: Record<string, unknown>): void {
    const eventName = this.data.eventName
    if (!eventName) return
    const bus = EventNodeEngine.resolveEventBus(this.globalData)
    bus.emitByName(eventName, data)
  }

  private bindEventBusSubscription(_ctx?: unknown): void {
    if (this.data.mode !== 'listen') return

    const eventName = this.data.eventName
    if (!eventName) return

    const bus = EventNodeEngine.resolveEventBus(this.globalData)
    this.currentEventName = eventName

    const callback = (payload: any) => {
      const unwrapped =
        payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined
          ? payload.data
          : payload

      this.emitOutput('trigger', true)
      this.emitOutput('payload', unwrapped)

      if (unwrapped && typeof unwrapped === 'object') {
        for (const [k, v] of Object.entries(unwrapped)) {
          if (v !== undefined) {
            this.emitOutput(k, v)
          }

          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            for (const [subK, subV] of Object.entries(v)) {
              if (subV !== undefined) {
                if (this.getOutputsSchema()[subK] !== undefined) {
                  this.emitOutput(subK, subV)
                }
                const prefixed = `${k}_${subK}`
                if (this.getOutputsSchema()[prefixed] !== undefined) {
                  this.emitOutput(prefixed, subV)
                }
              }
            }
          }
        }

        const rawSchema =
          this.eventDef?.schema ??
          this.eventDef?.eventClass?.schema ??
          this.eventDef?.struct
        if (isAnyComponentRequirement(rawSchema) && rawSchema.components.length === 1) {
          let compName = ''
          try {
            compName = getComponentName(rawSchema.components[0])
          } catch {
            compName = 'component'
          }
          const compKey = lowerFirst(compName)
          if (this.getOutputsSchema()[compKey] !== undefined && unwrapped[compKey] === undefined) {
            this.emitOutput(compKey, unwrapped)
          }
        }
      }

      // Reset pulse trigger
      setTimeout(() => {
        this.emitOutput('trigger', false)
      }, 50)
    }

    const registry = EventNodeEngine.resolveEventRegistry(this.globalData)
    const eventDef = registry.get(eventName)

    const unsubs: Array<() => void> = []

    // Listen on EventBus by name
    if ((bus as any).onByName) {
      unsubs.push((bus as any).onByName(eventName, callback))
    }

    if (eventDef?.eventClass && typeof (bus as any).on === 'function') {
      try {
        const unsub = bus.on(eventDef.eventClass, callback)
        if (typeof unsub === 'function') unsubs.push(unsub)
      } catch {
        // ignore
      }
    } else if (typeof (bus as any).on === 'function') {
      try {
        const mockEventClass = { name: eventName } as any
        const unsub = bus.on(mockEventClass, callback)
        if (typeof unsub === 'function') unsubs.push(unsub)
      } catch {
        // ignore
      }
    }

    this.activeUnsubscribe = () => {
      unsubs.forEach((fn) => {
        try {
          fn()
        } catch {}
      })
    }
  }

  private unbindEventBusSubscription(): void {
    if (this.activeUnsubscribe) {
      this.activeUnsubscribe()
      this.activeUnsubscribe = null
    }
  }
}

export function createEventNode(
  options: Partial<NodeInitOptions<any, any, EventNodeData, EventNodeGlobalData>> = {},
  globalData?: EventNodeGlobalData,
) {
  return new EventNodeEngine(options, globalData)
}
