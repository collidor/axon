import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions, type MapSchema } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import {
  COMPARE_OPERATIONS,
  isEmptyValue,
  isTruthyValue,
  safeToString,
} from './operationMaps'

export type CompareInputSchema = {
  a: null
  b: null
  operator: typeof String
}

export type CompareOutputSchema = {
  result: typeof Boolean
}

export interface CompareData {
  a?: unknown
  b?: unknown
  operator?: string
  [key: string]: unknown
}

export const compareDataSchema = s.struct({
  a: s.any().optional(),
  b: s.any().optional(),
  operator: s
    .enum([
      'EQUALS',
      'EQ',
      '==',
      'STRICT_EQUALS',
      'SEQ',
      '===',
      'NOT_EQUALS',
      'NEQ',
      '!=',
      'GREATER_THAN',
      'GT',
      '>',
      'GREATER_EQUAL',
      'GTE',
      '>=',
      'LESS_THAN',
      'LT',
      '<',
      'LESS_EQUAL',
      'LTE',
      '<=',
      'TRUTHY',
      'FALSY',
      'IS_EMPTY',
      'IS_NOT_EMPTY',
    ])
    .default('EQUALS'),
})

export const compareNodeConfig: NodeInitOptions<
  CompareInputSchema,
  CompareOutputSchema,
  CompareData
> = {
  nodeType: NODE_TYPES.COMPARE,
  dataSchema: compareDataSchema,
  inputs: {
    a: null,
    b: null,
    operator: String,
  },
  outputs: {
    result: Boolean,
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
  inputs: Partial<MapSchema<CompareInputSchema>>,
  emitOutput: <K extends keyof CompareOutputSchema>(
    outputName: K,
    value: MapSchema<CompareOutputSchema>[K],
  ) => void,
  data?: CompareData,
) {
  const a = inputs.a !== undefined ? inputs.a : data?.a
  const b = inputs.b !== undefined ? inputs.b : data?.b
  const operator = (inputs.operator || data?.operator || 'TRUTHY').toUpperCase()

  const opFn = COMPARE_OPERATIONS[operator] ?? ((val: any) => isTruthyValue(val))
  const result = opFn(a, b)

  emitOutput('result', result)
}

export function createCompareNode(
  options: Partial<NodeInitOptions<CompareInputSchema, CompareOutputSchema, CompareData>> = {},
) {
  return new BaseNode({ ...compareNodeConfig, ...options })
}

export { isEmptyValue, isTruthyValue, safeToString }
