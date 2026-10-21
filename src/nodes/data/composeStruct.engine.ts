import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import { s, type StructDescriptor, type StructSchema } from '@collidor/struct'
import { descriptorToConstructor } from '../event.node'

export interface ComposeStructInputField {
  name: string
  type?: string
  default?: any
  optional?: boolean
}

export interface ComposeStructNodeData {
  structName?: string
  struct?: StructSchema<any> | StructDescriptor
  schema?: StructSchema<any> | StructDescriptor
  fields?: ComposeStructInputField[]
  validate?: boolean
  [key: string]: unknown
}

export const composeStructDataSchema = s.struct({
  structName: s.string().default('HealTargetPayload'),
  validate: s.boolean().default(false),
})

export class ComposeStructNodeEngine extends BaseNode<any, any, ComposeStructNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, ComposeStructNodeData>> = {}) {
    const initialData: ComposeStructNodeData = {
      structName: options.initialData?.structName ?? 'HealTargetPayload',
      ...options.initialData,
    }

    const schemaObj = initialData.schema ?? initialData.struct
    const descriptor: StructDescriptor | undefined =
      schemaObj && typeof schemaObj === 'object' && 'descriptor' in schemaObj
        ? (schemaObj.descriptor as StructDescriptor)
        : (schemaObj as StructDescriptor | undefined)

    const dynamicInputs: Record<string, any> = { ...options.inputs }

    // Derive inputs from schema descriptor if available
    if (descriptor?.fields) {
      for (const [key, fieldDesc] of Object.entries(descriptor.fields)) {
        if (!(key in dynamicInputs)) {
          dynamicInputs[key] = descriptorToConstructor(fieldDesc as any)
        }
      }
    } else if (initialData.fields && Array.isArray(initialData.fields)) {
      for (const f of initialData.fields) {
        if (f && f.name && !(f.name in dynamicInputs)) dynamicInputs[f.name] = null
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
      nodeType: NODE_TYPES.COMPOSE_STRUCT,
      dataSchema: options.dataSchema ?? composeStructDataSchema,
      inputs: dynamicInputs,
      outputs: options.outputs ?? {
        payload: null,
        output: null,
        result: null,
        valid: Boolean,
        errors: null,
      },
      initialData,
      onInit: (ctx) => {
        ;(ctx.node as ComposeStructNodeEngine).compose()
        _optOnInit?.(ctx)
      },
      onInputChange: (name, val, ctx) => {
        ;(ctx.node as ComposeStructNodeEngine).compose()
        _optOnInputChange?.(name, val, ctx)
      },
    })

    this.compose()
  }

  public compose(): Record<string, unknown> {
    let result: Record<string, unknown> = {}

    // 1. Copy any literal values defined in node.data
    const reserved = new Set([
      'structName',
      'fields',
      'struct',
      'schema',
      'validate',
      'id',
      'type',
      'x',
      'y',
    ])
    if (this.data) {
      for (const [key, val] of Object.entries(this.data)) {
        if (!reserved.has(key) && val !== undefined) {
          result[key] = val
        }
      }
    }

    // 2. Override with incoming port inputs
    const inputs = this.getInputs()
    if (inputs) {
      for (const [key, val] of Object.entries(inputs)) {
        if (val !== undefined && val !== null) {
          result[key] = val
        }
      }
    }

    // 3. Optional validation if @collidor/struct schema is attached
    const schemaObj = this.data.schema ?? this.data.struct
    if (
      schemaObj &&
      typeof schemaObj === 'object' &&
      'safeParse' in schemaObj &&
      typeof (schemaObj as any).safeParse === 'function' &&
      this.data.validate !== false
    ) {
      const parsed = (schemaObj as any).safeParse(result)
      if (parsed.success) {
        result = parsed.data
        this.emitOutput('valid', true)
        this.emitOutput('errors', null)
      } else {
        this.emitOutput('valid', false)
        this.emitOutput('errors', parsed.issues ?? [parsed.error])
      }
    } else {
      this.emitOutput('valid', true)
      this.emitOutput('errors', null)
    }

    this.emitOutput('payload', result)
    this.emitOutput('output', result)
    this.emitOutput('result', result)
    return result
  }

  public execute(): Record<string, unknown> {
    return this.compose()
  }
}

export function createComposeStructNode(
  options?: Partial<NodeInitOptions<any, any, ComposeStructNodeData>>,
) {
  return new ComposeStructNodeEngine(options)
}
