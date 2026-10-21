// oxlint-disable typescript/no-explicit-any
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import { Command, CommandBus, CommandHistoryManager, globalCommandHistory } from '@collidor/command'
import type { StructDescriptor, TypeDescriptor } from '@collidor/struct'
import { getComponentName } from '@collidor/struct'

import { isAnyComponentRequirement, type CommandRegistry } from '../../commands/commandRegistry'

const lowerFirst = (str: string): string =>
  str.length > 0 ? str.charAt(0).toLowerCase() + str.slice(1) : str

import { CommandHandlerNodeEngine } from './commandHandler.engine'
import { descriptorToConstructor } from './event.engine'

import { s } from '@collidor/struct'

export interface CommandDispatchNodeData {
  commandName?: string
  payload?: Record<string, unknown>
  useHistory?: boolean
  [key: string]: unknown
}

export const commandDispatchDataSchema = s.struct({
  commandName: s.string().default('MoveCommand'),
  useHistory: s.boolean().default(true),
})

export interface CommandDispatchGlobalData {
  commandBus?: CommandBus
  commandRegistry?: CommandRegistry
  historyManager?: CommandHistoryManager
  injector?: any
  [key: string]: unknown
}

/**
 * Derives Axon input and output port schemas based on the Command's Struct schema.
 */
export function deriveCommandDispatchPortSchemas(
  schemaOrDescriptor?: any,
): { inputs: Record<string, unknown>; outputs: Record<string, unknown> } {
  const inputSchema =
    schemaOrDescriptor?.schema?.input ??
    schemaOrDescriptor?.commandClass?.schema?.input ??
    schemaOrDescriptor?.inputSchema ??
    schemaOrDescriptor?.input ??
    schemaOrDescriptor?.struct ??
    schemaOrDescriptor
  const outputSchema =
    schemaOrDescriptor?.schema?.output ??
    schemaOrDescriptor?.commandClass?.schema?.output ??
    schemaOrDescriptor?.outputSchema ??
    schemaOrDescriptor?.output ??
    schemaOrDescriptor?.resultStruct

  const inputs: Record<string, unknown> = {
    trigger: Boolean,
    commandName: String,
    data: null,
  }

  if (isAnyComponentRequirement(inputSchema)) {
    inputs.entity = Object
    for (const comp of inputSchema.components) {
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
          if (inputSchema.components.length === 1) {
            inputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
          } else {
            inputs[`${compKey}_${key}`] = descriptorToConstructor(fieldDesc as TypeDescriptor)
          }
        }
      }
    }
  } else {
    const descriptor =
      inputSchema && 'fields' in inputSchema
        ? inputSchema
        : inputSchema && 'descriptor' in inputSchema
          ? inputSchema.descriptor
          : undefined

    if (descriptor?.fields) {
      for (const [key, fieldDesc] of Object.entries(descriptor.fields)) {
        inputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
      }
    }
  }

  let resultType: unknown = null
  if (outputSchema) {
    const outDesc =
      outputSchema && 'kind' in outputSchema
        ? outputSchema
        : outputSchema && 'descriptor' in outputSchema
          ? outputSchema.descriptor
          : undefined
    if (outDesc) {
      resultType = descriptorToConstructor(outDesc as TypeDescriptor)
    }
  }

  return {
    inputs,
    outputs: {
      trigger: Boolean,
      result: resultType,
      success: Boolean,
      error: null,
    },
  }
}

export class CommandDispatchNodeEngine extends BaseNode<
  any,
  any,
  CommandDispatchNodeData,
  CommandDispatchGlobalData
> {
  constructor(
    options: Partial<
      NodeInitOptions<any, any, CommandDispatchNodeData, CommandDispatchGlobalData>
    > = {},
    globalData?: CommandDispatchGlobalData,
  ) {
    const initialData: CommandDispatchNodeData = {
      commandName: options.initialData?.commandName ?? 'DealDamageCommand',
      payload: options.initialData?.payload ?? {},
      useHistory: options.initialData?.useHistory ?? false,
      ...options.initialData,
    }

    const registry = CommandHandlerNodeEngine.resolveCommandRegistry(globalData)
    const cmdDef = initialData.commandName ? registry.get(initialData.commandName) : undefined
    const { inputs, outputs } = deriveCommandDispatchPortSchemas(cmdDef)

    super(
      {
        nodeType: NODE_TYPES.COMMAND_DISPATCH,
        dataSchema: options.dataSchema ?? commandDispatchDataSchema,
        inputs: options.inputs ?? inputs,
        outputs: options.outputs ?? outputs,
        initialData,
        onInit: options.onInit,
        onDestroy: options.onDestroy,
        onInputChange: (name, value, ctx) => {
          if (name === 'trigger' && Boolean(value)) {
            ;(ctx.node as CommandDispatchNodeEngine).dispatchCommand(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
        ...options,
      },
      globalData,
    )
  }

  public setCommand(commandName: string): void {
    this.data.commandName = commandName
    const registry = CommandHandlerNodeEngine.resolveCommandRegistry(this.globalData)
    const cmdDef = registry.get(commandName)

    const { inputs, outputs } = deriveCommandDispatchPortSchemas(cmdDef)
    this.reconfigurePorts(inputs, outputs)
  }

  public dispatchCommand(ctx?: any): any {
    const contextInputs = ctx?.inputs ?? this.getInputs()
    const commandName = contextInputs.commandName || this.data.commandName
    if (!commandName) {
      this.emitOutput('success', false)
      this.emitOutput('error', 'No commandName provided')
      return null
    }

    const bus =
      this.globalData?.commandBus ?? CommandHandlerNodeEngine.resolveCommandBus(this.globalData)

    const registry =
      this.globalData?.commandRegistry ??
      CommandHandlerNodeEngine.resolveCommandRegistry(this.globalData)

    const cmdDef = registry.get(commandName)
    const inputSchema =
      cmdDef?.commandClass?.schema?.input ??
      (cmdDef?.commandClass as any)?.schema?.input ??
      cmdDef?.struct

    let commandArg: any

    if (isAnyComponentRequirement(inputSchema)) {
      let entity: Record<string, unknown> = {}
      if (contextInputs.entity && typeof contextInputs.entity === 'object') {
        entity = { ...(contextInputs.entity as Record<string, unknown>) }
      } else if (contextInputs.data && typeof contextInputs.data === 'object') {
        entity = { ...(contextInputs.data as Record<string, unknown>) }
      } else if (contextInputs.payload && typeof contextInputs.payload === 'object') {
        entity = { ...(contextInputs.payload as Record<string, unknown>) }
      }

      for (const comp of inputSchema.components) {
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
              if (inputSchema.components.length === 1 && contextInputs[fKey] !== undefined) {
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

      commandArg = entity
    } else {
      const payload: Record<string, unknown> = {
        ...this.data.payload,
        ...(typeof contextInputs.payload === 'object' && contextInputs.payload !== null
          ? contextInputs.payload
          : typeof contextInputs.data === 'object' && contextInputs.data !== null
            ? contextInputs.data
            : {}),
      }

      // Capture dynamic inputs from struct
      const fields =
        cmdDef?.struct && 'fields' in cmdDef.struct
          ? cmdDef.struct.fields
          : cmdDef?.struct && 'descriptor' in cmdDef.struct
            ? (cmdDef.struct as any).descriptor?.fields
            : undefined

      if (fields) {
        for (const key of Object.keys(fields)) {
          if (contextInputs[key] !== undefined) {
            payload[key] = contextInputs[key]
          }
        }
      }

      for (const [k, v] of Object.entries(contextInputs)) {
        if (
          k !== 'trigger' &&
          k !== 'commandName' &&
          k !== 'data' &&
          k !== 'payload' &&
          k !== 'entity' &&
          v !== undefined
        ) {
          payload[k] = v
        }
      }

      commandArg = payload
    }

    const commandClass =
      cmdDef?.commandClass ??
      (() => {
        const cls = class extends Command {
          constructor(data: any) {
            super(data)
          }
        }
        Object.defineProperty(cls, 'name', { value: commandName })
        return cls
      })()

    const cmdInstance = new commandClass(commandArg)

    try {
      let result: any
      if (this.data.useHistory) {
        const history = this.globalData?.historyManager ?? globalCommandHistory
        result = history.execute(cmdInstance, cmdInstance, {
          bus: bus ?? undefined,
          source: 'axon-command-dispatch',
          description: `Dispatch ${commandName}`,
        })
      } else if (bus) {
        result = bus.execute(cmdInstance)
      } else {
        throw new Error(`CommandBus not available to dispatch '${commandName}'`)
      }

      this.emitOutput('result', result)
      this.emitOutput('success', true)
      this.emitOutput('error', null)
      this.emitOutput('trigger', true)

      setTimeout(() => {
        this.emitOutput('trigger', false)
      }, 50)

      return result
    } catch (err: any) {
      const errorMsg = err?.message || String(err)
      this.emitOutput('success', false)
      this.emitOutput('error', errorMsg)
      this.emitOutput('result', null)
      return null
    }
  }

  private reconfigurePorts(
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>,
  ): void {
    const currentInputs = this.getInputsSchema()
    const currentOutputs = this.getOutputsSchema()

    for (const key of Object.keys(currentInputs)) {
      if (!(key in inputs)) {
        this.removeInput(key)
      }
    }
    for (const [key, type] of Object.entries(inputs)) {
      if (!(key in currentInputs)) {
        this.addInput(key, type)
      }
    }

    for (const key of Object.keys(currentOutputs)) {
      if (!(key in outputs)) {
        this.removeOutput(key)
      }
    }
    for (const [key, type] of Object.entries(outputs)) {
      if (!(key in currentOutputs)) {
        this.addOutput(key, type)
      }
    }
  }
}

export function createCommandDispatchNode(
  options: Partial<
    NodeInitOptions<any, any, CommandDispatchNodeData, CommandDispatchGlobalData>
  > = {},
  globalData?: CommandDispatchGlobalData,
) {
  return new CommandDispatchNodeEngine(options, globalData)
}
