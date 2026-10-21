import { BaseNode, type NodeInitOptions, type MapSchema } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import { LOGIC_OPERATIONS } from './operationMaps'

export type LogicInputSchema = {
  a: typeof Boolean
  b: typeof Boolean
  operator: typeof String
}

export type LogicOutputSchema = {
  result: typeof Boolean
}

export interface LogicData {
  a?: boolean
  b?: boolean
  operator?: string
  [key: string]: unknown
}

export const logicNodeConfig: NodeInitOptions<LogicInputSchema, LogicOutputSchema, LogicData> = {
  nodeType: NODE_TYPES.LOGIC,
  inputs: {
    a: Boolean,
    b: Boolean,
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
  inputs: Partial<MapSchema<LogicInputSchema>>,
  emitOutput: <K extends keyof LogicOutputSchema>(
    outputName: K,
    value: MapSchema<LogicOutputSchema>[K],
  ) => void,
  data?: LogicData,
) {
  const a = Boolean(inputs.a !== undefined ? inputs.a : data?.a)
  const b = Boolean(inputs.b !== undefined ? inputs.b : data?.b)
  const operator = (inputs.operator || data?.operator || 'AND').toUpperCase()

  const opFn = LOGIC_OPERATIONS[operator] ?? (() => false)
  const result = opFn(a, b)

  emitOutput('result', result)
}

export function createLogicNode(
  options: Partial<NodeInitOptions<LogicInputSchema, LogicOutputSchema, LogicData>> = {},
) {
  return new BaseNode({ ...logicNodeConfig, ...options })
}
