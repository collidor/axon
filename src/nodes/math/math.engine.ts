import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions, type MapSchema } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import { MATH_OPERATIONS } from './operationMaps'

export type MathInputSchema = {
  a: typeof Number
  b: typeof Number
  operator: typeof String
}

export type MathOutputSchema = {
  result: typeof Number
}

export interface MathData {
  a?: number
  b?: number
  operator?: string
  [key: string]: unknown
}

export const mathDataSchema = s.struct({
  a: s.number().default(0),
  b: s.number().default(0),
  operator: s.enum(['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'POWER', 'MODULO']).default('ADD'),
})

export const mathNodeConfig: NodeInitOptions<MathInputSchema, MathOutputSchema, MathData> = {
  nodeType: NODE_TYPES.MATH,
  dataSchema: mathDataSchema,
  inputs: {
    a: Number,
    b: Number,
    operator: String,
  },
  outputs: {
    result: Number,
  },
  onInit({ inputs, emitOutput, data, node }) {
    if (data.a !== undefined) node.setInput('a', data.a)
    if (data.b !== undefined) node.setInput('b', data.b)
    if (data.operator !== undefined) node.setInput('operator', data.operator)

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

function execute(
  inputs: Partial<MapSchema<MathInputSchema>>,
  emitOutput: <K extends keyof MathOutputSchema>(
    outputName: K,
    value: MapSchema<MathOutputSchema>[K],
  ) => void,
  data?: MathData,
) {
  const a = typeof inputs.a === 'number' ? inputs.a : typeof data?.a === 'number' ? data.a : 0
  const b = typeof inputs.b === 'number' ? inputs.b : typeof data?.b === 'number' ? data.b : 0
  const operator = inputs.operator || data?.operator || 'ADD'

  const opFn = MATH_OPERATIONS[operator.toUpperCase()] ?? (() => 0)
  const result = opFn(a, b)

  emitOutput('result', result)
}

export function createMathNode(
  options: Partial<NodeInitOptions<MathInputSchema, MathOutputSchema, MathData>> = {},
) {
  return new BaseNode({ ...mathNodeConfig, ...options })
}
