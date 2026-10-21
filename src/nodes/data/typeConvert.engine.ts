import { BaseNode, type NodeInitOptions, type MapSchema } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export type TypeConvertTarget = 'integer' | 'number' | 'string' | 'boolean' | 'json'

export type TypeConvertInputSchema = {
  input: null
  radix: typeof Number
}

export type TypeConvertOutputSchema = {
  output: null
  result: null
  value: null
  integer: typeof Number
}

export interface TypeConvertData {
  targetType?: TypeConvertTarget
  fallback?: unknown
  radix?: number
  [key: string]: unknown
}

export const typeConvertNodeConfig: NodeInitOptions<
  TypeConvertInputSchema,
  TypeConvertOutputSchema,
  TypeConvertData
> = {
  nodeType: NODE_TYPES.TYPE_CONVERT,
  inputs: {
    input: null,
    radix: Number,
  },
  outputs: {
    output: null,
    result: null,
    value: null,
    integer: Number,
  },
  initialData: {
    targetType: 'integer',
    fallback: undefined,
    radix: 10,
  },
  onInit({ inputs, emitOutput, data, node }) {
    if (data.targetType !== undefined) node.setInput('targetType' as any, data.targetType)
    if (data.radix !== undefined) node.setInput('radix', data.radix)
    execute(inputs, emitOutput, data)
  },
  onInputChange(name, value, { inputs, emitOutput, data }) {
    data[name as string] = value
    execute(inputs, emitOutput, data)
  },
  onInputDisconnect(_name, { inputs, emitOutput, data }) {
    execute(inputs, emitOutput, data)
  },
}

function safeToString(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') {
    return String(val)
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return ''
    }
  }
  return ''
}

export function convertValue(
  raw: unknown,
  targetType: string = 'integer',
  fallback?: unknown,
  radix: number = 10,
): unknown {
  const normTarget = targetType.toLowerCase()

  if (normTarget === 'integer' || normTarget === 'int') {
    if (raw === undefined || raw === null || raw === '') {
      return fallback !== undefined ? Number(fallback) : 0
    }
    if (typeof raw === 'number') {
      return Math.trunc(raw)
    }
    if (typeof raw === 'boolean') {
      return raw ? 1 : 0
    }
    const r = isNaN(radix) || radix <= 0 ? 10 : radix
    const parsed = parseInt(safeToString(raw).trim(), r)
    return isNaN(parsed) ? (fallback !== undefined ? Number(fallback) : 0) : parsed
  }

  if (normTarget === 'number' || normTarget === 'float') {
    if (raw === undefined || raw === null || raw === '') {
      return fallback !== undefined ? Number(fallback) : 0
    }
    if (typeof raw === 'number') {
      return raw
    }
    if (typeof raw === 'boolean') {
      return raw ? 1 : 0
    }
    const parsed = parseFloat(safeToString(raw).trim())
    return isNaN(parsed) ? (fallback !== undefined ? Number(fallback) : 0) : parsed
  }

  if (normTarget === 'string' || normTarget === 'str') {
    if (raw === undefined || raw === null) {
      return fallback !== undefined ? safeToString(fallback) : ''
    }
    return safeToString(raw)
  }

  if (normTarget === 'boolean' || normTarget === 'bool') {
    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'string') {
      const lower = raw.trim().toLowerCase()
      return lower !== 'false' && lower !== '0' && lower !== 'no' && lower !== ''
    }
    return Boolean(raw)
  }

  if (normTarget === 'json') {
    if (typeof raw === 'object' && raw !== null) return raw
    try {
      return JSON.parse(safeToString(raw))
    } catch {
      return fallback !== undefined ? fallback : null
    }
  }

  return raw
}

function execute(
  inputs: Partial<MapSchema<TypeConvertInputSchema>>,
  emitOutput: <K extends keyof TypeConvertOutputSchema>(
    outputName: K,
    value: MapSchema<TypeConvertOutputSchema>[K],
  ) => void,
  data?: TypeConvertData,
) {
  const raw = inputs.input !== undefined ? inputs.input : (data?.input ?? data?.value)
  const targetType = String(data?.targetType || 'integer')
  const radix = Number(inputs.radix ?? data?.radix ?? 10)
  const fallback = data?.fallback

  const result = convertValue(raw, targetType, fallback, radix)

  emitOutput('output', result as any)
  emitOutput('result', result as any)
  emitOutput('value', result as any)
  emitOutput('integer', typeof result === 'number' ? result : Number(result) || 0)
}

export class TypeConvertNodeEngine extends BaseNode<any, any, TypeConvertData> {
  constructor(options: Partial<NodeInitOptions<any, any, TypeConvertData>> = {}) {
    super({ ...typeConvertNodeConfig, ...options } as any)
  }
}

export function createTypeConvertNode(
  options: Partial<NodeInitOptions<any, any, TypeConvertData>> = {},
): TypeConvertNodeEngine {
  return new TypeConvertNodeEngine(options)
}
