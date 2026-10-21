// oxlint-disable typescript/no-explicit-any
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import { getComponent, hasComponent } from '@collidor/struct'
import type { BaseSchema, StructDescriptor, TypeDescriptor } from '@collidor/struct'
import { descriptorToConstructor } from './event.engine'

function getCandidateKeys(name: string): string[] {
  if (!name) return []
  const lower = name.charAt(0).toLowerCase() + name.slice(1)
  const upper = name.charAt(0).toUpperCase() + name.slice(1)
  return lower === upper ? [lower] : [lower, upper]
}

export interface ExtractComponentNodeData {
  componentName?: string
  struct?: BaseSchema<any, any> | StructDescriptor | { descriptor: StructDescriptor }
  [key: string]: unknown
}

export class ExtractComponentNodeEngine extends BaseNode<any, any, ExtractComponentNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, ExtractComponentNodeData>> = {}) {
    const initialData: ExtractComponentNodeData = {
      componentName: options.initialData?.componentName ?? 'Position',
      ...options.initialData,
    }

    const dynamicOutputs: Record<string, any> = {
      component: null,
      hasComponent: Boolean,
      entity: null,
      ...options.outputs,
    }

    const structObj = initialData.struct
    const structDesc =
      structObj && typeof structObj === 'object' && 'descriptor' in structObj
        ? (structObj.descriptor as StructDescriptor)
        : (structObj as StructDescriptor | undefined)

    if (structDesc?.fields) {
      for (const [key, fieldDesc] of Object.entries(structDesc.fields)) {
        if (!(key in dynamicOutputs)) {
          dynamicOutputs[key] = descriptorToConstructor(fieldDesc as TypeDescriptor)
        }
      }
    }

    const {
      inputs: _optInputs,
      outputs: _optOutputs,
      initialData: _optInitialData,
      onInit: _optOnInit,
      onInputChange: _optOnInputChange,
      ...restOptions
    } = options

    super({
      ...restOptions,
      nodeType: NODE_TYPES.EXTRACT_COMPONENT,
      inputs: options.inputs ?? {
        entity: null,
        componentName: String,
      },
      outputs: dynamicOutputs,
      initialData,
      onInit: (ctx) => {
        ;(ctx.node as ExtractComponentNodeEngine).extract()
        _optOnInit?.(ctx)
      },
      onInputChange: (name, val, ctx) => {
        ;(ctx.node as ExtractComponentNodeEngine).extract()
        _optOnInputChange?.(name, val, ctx)
      },
    })

    this.extract()
  }

  public extract(): Record<string, unknown> | null {
    const inputs = this.getInputs()
    const entity = inputs.entity ?? this.data.entity
    const componentName = (inputs.componentName as string | undefined) || this.data.componentName
    const structSchema = this.data.struct

    this.emitOutput('entity', entity)

    if (!entity || typeof entity !== 'object') {
      this.emitOutput('component', null)
      this.emitOutput('hasComponent', false)
      return null
    }

    // 1. If a full @collidor/struct schema is attached, use hasComponent / getComponent directly
    if (
      structSchema &&
      typeof structSchema === 'object' &&
      'safeParse' in structSchema &&
      typeof (structSchema as any).safeParse === 'function'
    ) {
      const exists = hasComponent(entity, structSchema as BaseSchema<any, any>)
      this.emitOutput('hasComponent', exists)
      if (!exists) {
        this.emitOutput('component', null)
        return null
      }
      try {
        const comp = getComponent(entity, structSchema as BaseSchema<any, any>)
        this.emitOutput('component', comp)
        if (comp && typeof comp === 'object') {
          for (const [k, v] of Object.entries(comp as Record<string, unknown>)) {
            if (k in this.getOutputsSchema()) {
              this.emitOutput(k, v)
            }
          }
        }
        return comp as Record<string, unknown>
      } catch {
        this.emitOutput('component', null)
        this.emitOutput('hasComponent', false)
        return null
      }
    }

    // 2. Otherwise look up property by component name (lowercased or uppercased)
    if (!componentName) {
      this.emitOutput('component', null)
      this.emitOutput('hasComponent', false)
      return null
    }

    const candidateKeys = getCandidateKeys(componentName)
    const entityRecord = entity as Record<string, unknown>
    const foundKey = candidateKeys.find((k) => entityRecord[k] !== undefined)

    if (!foundKey) {
      this.emitOutput('component', null)
      this.emitOutput('hasComponent', false)
      return null
    }

    const comp = entityRecord[foundKey]
    this.emitOutput('hasComponent', true)
    this.emitOutput('component', comp)

    if (comp && typeof comp === 'object') {
      for (const [k, v] of Object.entries(comp as Record<string, unknown>)) {
        if (k in this.getOutputsSchema()) {
          this.emitOutput(k, v)
        }
      }
    }

    return comp as Record<string, unknown>
  }

  public execute(): Record<string, unknown> | null {
    return this.extract()
  }
}

export function createExtractComponentNode(
  options?: Partial<NodeInitOptions<any, any, ExtractComponentNodeData>>,
) {
  return new ExtractComponentNodeEngine(options)
}
