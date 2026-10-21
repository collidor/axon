import { BaseNode, type NodeInitOptions, type MapSchema } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export type GateInputSchema = {
  open: typeof Boolean
  data: null
}

export type GateOutputSchema = {
  output: null
}

export interface GateData {
  open?: boolean
  data?: unknown
  [key: string]: unknown
}

export const gateNodeConfig: NodeInitOptions<GateInputSchema, GateOutputSchema, GateData> = {
  nodeType: NODE_TYPES.GATE,
  inputs: {
    open: Boolean,
    data: null,
  },
  outputs: {
    output: null,
  },
  onInit({ inputs, emitOutput, data, node }) {
    if (data.open !== undefined) node.setInput('open', data.open)
    if (data.data !== undefined) node.setInput('data', data.data)

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
  inputs: Partial<MapSchema<GateInputSchema>>,
  emitOutput: <K extends keyof GateOutputSchema>(
    outputName: K,
    value: MapSchema<GateOutputSchema>[K],
  ) => void,
  data?: GateData,
) {
  const isOpen =
    typeof inputs.open === 'boolean'
      ? inputs.open
      : typeof data?.open === 'boolean'
        ? data.open
        : false

  if (isOpen) {
    const payload = inputs.data !== undefined ? inputs.data : data?.data
    emitOutput('output', payload)
  }
}

export function createGateNode(
  options: Partial<NodeInitOptions<GateInputSchema, GateOutputSchema, GateData>> = {},
) {
  return new BaseNode({ ...gateNodeConfig, ...options })
}
