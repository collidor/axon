import { BaseNode, type NodeInitOptions } from '../core/base.node'
import { NODE_TYPES } from './nodes.constants'

export type DisplayInputSchema = {
  value: unknown
}

export type DisplayOutputSchema = Record<string, never>

export const displayNodeConfig: NodeInitOptions<DisplayInputSchema, DisplayOutputSchema> = {
  nodeType: NODE_TYPES.DISPLAY,
  inputs: {
    value: null,
  },
  outputs: {},
}

export function createDisplayNode(
  options: Partial<NodeInitOptions<DisplayInputSchema, DisplayOutputSchema>> = {},
) {
  return new BaseNode({ ...displayNodeConfig, ...options })
}
