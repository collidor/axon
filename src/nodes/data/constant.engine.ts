import { s } from '@collidor/struct'
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export type ConstantInputSchema = {
  value: unknown
}

export type ConstantOutputSchema = {
  value: unknown
}

export interface ConstantData {
  value?: unknown
  [key: string]: unknown
}

export const constantDataSchema = s.struct({
  value: s.any().default(0),
})

export const constantNodeConfig: NodeInitOptions<
  ConstantInputSchema,
  ConstantOutputSchema,
  ConstantData
> = {
  nodeType: NODE_TYPES.CONSTANT,
  dataSchema: constantDataSchema,
  inputs: {
    value: null,
  },
  outputs: {
    value: null,
  },
  initialData: {
    value: 0,
  },
  onInit({ data, node, emitOutput }) {
    if (data.value !== undefined) {
      node.setInput('value', data.value)
      emitOutput('value', data.value)
    }
  },
  onInputChange(name, value, { data, emitOutput }) {
    if (name === 'value') {
      data.value = value
      emitOutput('value', value)
    }
  },
}

export function createConstantNode(
  options: Partial<NodeInitOptions<ConstantInputSchema, ConstantOutputSchema, ConstantData>> = {},
) {
  return new BaseNode({ ...constantNodeConfig, ...options })
}
