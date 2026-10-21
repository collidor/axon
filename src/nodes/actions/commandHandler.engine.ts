// oxlint-disable typescript/no-explicit-any
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import { Command, CommandBus, type Type } from '@collidor/command'
import type { StructDescriptor, TypeDescriptor } from '@collidor/struct'
import { getComponentName } from '@collidor/struct'

import { isAnyComponentRequirement } from '../../commands/commandRegistry'

const lowerFirst = (str: string): string =>
  str.length > 0 ? str.charAt(0).toLowerCase() + str.slice(1) : str
import {
  COMMAND_BUS_TOKEN,
  COMMAND_REGISTRY_TOKEN,
  defaultCommandBus,
  defaultCommandRegistry,
  type CommandRegistry,
  type CommandDefinition,
} from '../../commands/commandRegistry'
import { globalInjector } from '../../events/index'
import type { BaseGraph } from '../../core/base.graph'
import type { SerializedGraph } from '../../core/serialization'
import { loadHeadlessGraph } from '../../core/serialization'
import { descriptorToConstructor } from './event.engine'

export interface CommandHandlerNodeData {
  commandName?: string
  description?: string
  payload?: Record<string, unknown>
  [key: string]: unknown
}

export interface CommandHandlerGlobalData {
  commandBus?: CommandBus
  commandRegistry?: CommandRegistry
  injector?: any
  [key: string]: unknown
}

/**
 * Derives Axon input and output port schemas based on the Command's Struct schema.
 */
export function deriveCommandHandlerPortSchemas(
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

  let resultCtor: unknown = null
  if (outputSchema) {
    const outDesc =
      outputSchema && 'kind' in outputSchema
        ? outputSchema
        : outputSchema && 'descriptor' in outputSchema
          ? outputSchema.descriptor
          : undefined
    if (outDesc) {
      resultCtor = descriptorToConstructor(outDesc as TypeDescriptor)
    }
  }

  const outputs: Record<string, unknown> = {
    trigger: Boolean,
    data: null,
    commandName: String,
  }

  if (isAnyComponentRequirement(inputSchema)) {
    outputs.entity = Object
    for (const comp of inputSchema.components) {
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
          if (inputSchema.components.length === 1) {
            outputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
          } else {
            outputs[`${compKey}_${key}`] = descriptorToConstructor(fieldDesc as TypeDescriptor)
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
        outputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
      }
    }
  }

  return {
    inputs: {
      trigger: Boolean,
      data: null,
      result: resultCtor,
    },
    outputs,
  }
}

export class CommandHandlerNodeEngine extends BaseNode<
  any,
  any,
  CommandHandlerNodeData,
  CommandHandlerGlobalData
> {
  private activeUnregister: (() => void) | null = null
  public currentCommandName: string | null = null
  public cmdDef?: CommandDefinition

  constructor(
    options: Partial<
      NodeInitOptions<any, any, CommandHandlerNodeData, CommandHandlerGlobalData>
    > = {},
    globalData?: CommandHandlerGlobalData,
  ) {
    const initialData: CommandHandlerNodeData = {
      commandName: options.initialData?.commandName ?? 'DealDamageCommand',
      description: options.initialData?.description ?? '',
      payload: options.initialData?.payload ?? {},
      ...options.initialData,
    }

    const registry = CommandHandlerNodeEngine.resolveCommandRegistry(globalData)
    const cmdDef = initialData.commandName ? registry.get(initialData.commandName) : undefined
    const { inputs, outputs } = deriveCommandHandlerPortSchemas(cmdDef)

    super(
      {
        nodeType: NODE_TYPES.COMMAND_HANDLER,
        inputs: options.inputs ?? inputs,
        outputs: options.outputs ?? outputs,
        initialData,
        onInit: options.onInit,
        onDestroy: (ctx) => {
          this.unbindCommandBus()
          if (options.onDestroy) options.onDestroy(ctx)
        },
        onInputChange: (name, value, ctx) => {
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
        ...options,
      },
      globalData,
    )

    this.cmdDef = cmdDef
    this.bindCommandBus()
  }

  public static resolveCommandBus(globalData?: CommandHandlerGlobalData): CommandBus {
    if (globalData?.commandBus) return globalData.commandBus
    if (globalData?.injector) {
      const bus = globalData.injector.safeGet(COMMAND_BUS_TOKEN)
      if (bus) return bus as CommandBus
    }
    const globalBus = globalInjector.safeGet(COMMAND_BUS_TOKEN)
    return (globalBus as CommandBus) ?? defaultCommandBus
  }

  public static resolveCommandRegistry(globalData?: CommandHandlerGlobalData): CommandRegistry {
    if (globalData?.commandRegistry) return globalData.commandRegistry
    if (globalData?.injector) {
      const reg = globalData.injector.safeGet(COMMAND_REGISTRY_TOKEN)
      if (reg) return reg as CommandRegistry
    }
    const globalReg = globalInjector.safeGet(COMMAND_REGISTRY_TOKEN)
    return (globalReg as CommandRegistry) ?? defaultCommandRegistry
  }

  public setCommand(commandName: string): void {
    this.data.commandName = commandName
    const registry = CommandHandlerNodeEngine.resolveCommandRegistry(this.globalData)
    const cmdDef = registry.get(commandName)

    this.cmdDef = cmdDef
    const { inputs, outputs } = deriveCommandHandlerPortSchemas(cmdDef)
    this.reconfigurePorts(inputs, outputs)

    this.unbindCommandBus()
    this.bindCommandBus()
  }

  public bindCommandBus(busOverride?: CommandBus): void {
    const bus = busOverride ?? CommandHandlerNodeEngine.resolveCommandBus(this.globalData)
    const cmdName = this.data.commandName
    if (!bus || !cmdName) return

    const registry = CommandHandlerNodeEngine.resolveCommandRegistry(this.globalData)
    const cmdDef = registry.get(cmdName)

    this.currentCommandName = cmdName

    const handler = (cmd: Command, ctx?: any) => {
      return this.handleIncomingCommand(cmd.data, ctx)
    }

    if (cmdDef?.commandClass) {
      bus.register(cmdDef.commandClass, handler)
      this.activeUnregister = () => {
        const clsName = cmdDef.commandClass?.name || cmdName
        bus.handlers.delete(clsName)
        bus.commandConstructor.delete(clsName)
      }
    } else {
      // Named reference
      const mockClass = class extends Command {
        constructor(data: any) {
          super(data)
        }
      }
      Object.defineProperty(mockClass, 'name', { value: cmdName })

      bus.register(mockClass, handler)
      this.activeUnregister = () => {
        bus.handlers.delete(cmdName)
        bus.commandConstructor.delete(cmdName)
      }
    }
  }

  public unbindCommandBus(): void {
    if (this.activeUnregister) {
      this.activeUnregister()
      this.activeUnregister = null
    }
  }

  public handleIncomingCommand(data: Record<string, unknown> = {}, _ctx?: any): any {
    this.emitOutput('trigger', true)
    this.emitOutput('commandName', this.data.commandName)
    this.emitOutput('data', data)

    // Populate individual field outputs matching struct
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        if (!this.getOutputsSchema()[k]) {
          this.addOutput(k, null)
        }
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

      const inputSchema =
        this.cmdDef?.schema?.input ??
        (this.cmdDef?.commandClass as any)?.schema?.input ??
        this.cmdDef?.struct
      if (isAnyComponentRequirement(inputSchema) && inputSchema.components.length === 1) {
        let compName = ''
        try {
          compName = getComponentName(inputSchema.components[0])
        } catch {
          compName = 'component'
        }
        const compKey = lowerFirst(compName)
        if (this.getOutputsSchema()[compKey] !== undefined && data[compKey] === undefined) {
          this.emitOutput(compKey, data)
        }
      }
    }

    setTimeout(() => {
      this.emitOutput('trigger', false)
    }, 50)

    if ((this as any).graph && typeof (this as any).graph.flush === 'function') {
      ;(this as any).graph.flush()
    }

    const currentResult = this.getInput('result')
    if (currentResult !== undefined) {
      return currentResult
    }

    return data
  }

  public testInvoke(data: Record<string, unknown> = {}): any {
    return this.handleIncomingCommand(data)
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

export function createCommandHandlerNode(
  options: Partial<
    NodeInitOptions<any, any, CommandHandlerNodeData, CommandHandlerGlobalData>
  > = {},
  globalData?: CommandHandlerGlobalData,
) {
  return new CommandHandlerNodeEngine(options, globalData)
}

/**
 * Registers an entire Axon Graph as a command handler on a CommandBus.
 */
export function registerGraphAsCommandHandler(
  bus: CommandBus,
  commandType: string | Type<Command> | CommandDefinition,
  graphDataOrInstance: SerializedGraph | BaseGraph,
  options?: {
    resultPort?: string
    inputNodeId?: string
    inputMapping?: Record<string, string>
  },
): () => void {
  const commandClass: Type<Command> =
    typeof commandType === 'function'
      ? commandType
      : typeof commandType === 'object' && 'commandClass' in commandType && commandType.commandClass
        ? commandType.commandClass
        : (() => {
            const name = typeof commandType === 'string' ? commandType : commandType.name
            const cls = class extends Command {
              constructor(data: any) {
                super(data)
              }
            }
            Object.defineProperty(cls, 'name', { value: name })
            return cls
          })()

  const commandName = commandClass.name

  const handler = (cmd: Command) => {
    let graph: BaseGraph
    if ('settle' in graphDataOrInstance && typeof graphDataOrInstance.settle === 'function') {
      graph = graphDataOrInstance
    } else {
      graph = loadHeadlessGraph(graphDataOrInstance as SerializedGraph)
    }

    if (cmd.data && typeof cmd.data === 'object') {
      for (const [k, v] of Object.entries(cmd.data)) {
        const mappedPort = options?.inputMapping?.[k] || k
        const targetPort = options?.inputNodeId
          ? `${options.inputNodeId}:${mappedPort}`
          : mappedPort
        graph.setPortValue(targetPort, v)
      }
    }

    const nodes = (graph as any).getNodes ? (graph as any).getNodes() : []
    nodes.forEach((node: any) => {
      if (node.nodeType === NODE_TYPES.COMMAND_HANDLER) {
        node.handleIncomingCommand(cmd.data)
      }
    })

    if ('flush' in graph && typeof (graph as any).flush === 'function') {
      ;(graph as any).flush()
    }

    if (options?.resultPort) {
      return graph.getPortValue(options.resultPort)
    }

    return graph.exportState()
  }

  bus.register(commandClass, handler as any)

  return () => {
    bus.handlers.delete(commandName)
    bus.commandConstructor.delete(commandName)
  }
}
