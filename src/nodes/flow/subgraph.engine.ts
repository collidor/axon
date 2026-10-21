import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { BaseGraph } from '../../core/base.graph'
import { loadHeadlessGraph, type SerializedGraph } from '../../core/serialization'
import { typeMap } from '../../core/constants'
import { NODE_TYPES } from '../nodes.constants'

export interface GroupData {
  name?: string
  type?: string
  default?: any
  [key: string]: unknown
}

/**
 * Acts as an entry point for data into a subgraph.
 * Its 'value' output is driven by the SubgraphNode.
 */
const groupInputNodeConfig: NodeInitOptions<
  { name: typeof String; type: typeof String; value: null },
  { value: null },
  GroupData
> = {
  nodeType: NODE_TYPES.GROUP_INPUT,
  inputs: {
    name: String,
    type: String,
    value: null,
  },
  outputs: {
    value: null,
  },
  initialData: {
    name: 'input',
    type: 'number',
  },
  onInputChange: (name, value, ctx) => {
    if (name === 'name') ctx.data.name = value as string
    if (name === 'type') ctx.data.type = value as string
    if (name === 'value') {
      ctx.emitOutput('value', value)
    }
  },
}

export function createGroupInputNode(options?: { id?: string; initialData?: GroupData }) {
  return new BaseNode({ ...groupInputNodeConfig, ...options })
}

const groupOutputNodeConfig: NodeInitOptions<
  { name: typeof String; type: typeof String; value: null },
  Record<string, never>,
  GroupData
> = {
  nodeType: NODE_TYPES.GROUP_OUTPUT,
  inputs: {
    name: String,
    type: String,
    value: null,
  },
  outputs: {},
  initialData: {
    name: 'output',
    type: 'number',
  },
  onInputChange: (name, value, ctx) => {
    if (name === 'name') ctx.data.name = value as string
    if (name === 'type') ctx.data.type = value as string
  },
}

export function createGroupOutputNode(options?: { id?: string; initialData?: GroupData }) {
  return new BaseNode({ ...groupOutputNodeConfig, ...options })
}

export interface SubgraphData {
  name?: string
  graph: SerializedGraph
}

export interface SubgraphState {
  innerGraph: BaseGraph
  inputNodes: Map<string, BaseNode>
  unsubs: (() => void)[]
}

function dedupeName(baseName: string, usedNames: Set<string>): string {
  let uniqueName = baseName
  let counter = 1
  while (usedNames.has(uniqueName)) {
    uniqueName = `${baseName}_${counter++}`
  }
  usedNames.add(uniqueName)
  return uniqueName
}

/**
 * Dynamically synchronizes a SubgraphNode's input and output ports
 * with all GroupInputNode and GroupOutputNode instances present in its innerGraph.
 */
export function syncSubgraphPorts(
  subgraphNode: BaseNode<
    Record<string, unknown>,
    Record<string, unknown>,
    SubgraphData,
    unknown,
    SubgraphState
  >,
): void {
  const innerGraph = subgraphNode.state?.innerGraph
  if (!innerGraph || !subgraphNode.state) return

  // Clean up old subscriptions
  subgraphNode.state.unsubs?.forEach((u) => u())
  subgraphNode.state.unsubs = []
  subgraphNode.state.inputNodes.clear()

  const currentInputs = new Set(subgraphNode.inputNames)
  const currentOutputs = new Set(subgraphNode.outputNames)

  const desiredInputs = new Map<string, { type: unknown; innerNode: BaseNode }>()
  const desiredOutputs = new Map<string, { type: unknown; innerNode: BaseNode }>()
  const usedInputNames = new Set<string>()
  const usedOutputNames = new Set<string>()

  innerGraph.nodes.forEach((innerNode) => {
    const nodeData = innerNode.data as GroupData
    const baseName = nodeData?.name || 'io'
    const type = (nodeData?.type && nodeData.type in typeMap ? typeMap[nodeData.type] : null) || null

    if (innerNode.nodeType === NODE_TYPES.GROUP_INPUT) {
      const uniqueName = dedupeName(baseName, usedInputNames)
      desiredInputs.set(uniqueName, { type, innerNode })
    } else if (innerNode.nodeType === NODE_TYPES.GROUP_OUTPUT) {
      const uniqueName = dedupeName(baseName, usedOutputNames)
      desiredOutputs.set(uniqueName, { type, innerNode })
    }
  })

  // Remove inputs no longer in inner graph
  currentInputs.forEach((name) => {
    if (!desiredInputs.has(name as string)) {
      subgraphNode.removeInput(name as string)
    }
  })

  // Add / map inputs
  desiredInputs.forEach(({ type, innerNode }, name) => {
    subgraphNode.state.inputNodes.set(name, innerNode)
    if (!currentInputs.has(name)) {
      subgraphNode.addInput(name, type)
    }
    const currentVal = subgraphNode.getInput(name)
    if (currentVal !== undefined) {
      innerNode.setInput('value', currentVal)
    }
  })

  // Remove outputs no longer in inner graph
  currentOutputs.forEach((name) => {
    if (!desiredOutputs.has(name as string)) {
      subgraphNode.removeOutput(name as string)
    }
  })

  // Add outputs & subscribe to inner output group nodes
  desiredOutputs.forEach(({ type, innerNode }, name) => {
    if (!currentOutputs.has(name)) {
      subgraphNode.addOutput(name, type)
    }

    const unsub = innerNode.subscribeInput((inputProp, val) => {
      if (inputProp === 'value') {
        subgraphNode.emitOutput(name, val)
      }
    })
    subgraphNode.state.unsubs.push(unsub)

    const initialVal = innerNode.getInput('value')
    if (initialVal !== undefined) {
      subgraphNode.emitOutput(name, initialVal)
    }
  })
}

export const subgraphNodeConfig: NodeInitOptions<
  Record<string, unknown>,
  Record<string, unknown>,
  SubgraphData,
  unknown,
  SubgraphState
> = {
  nodeType: NODE_TYPES.SUBGRAPH,
  inputs: {},
  outputs: {},
  initialData: {
    name: 'Subgraph',
    graph: { nodes: [], edges: [] },
  },
  onInit(ctx) {
    ctx.state.inputNodes = new Map()
    ctx.state.unsubs = []

    const innerGraph = loadHeadlessGraph(ctx.data.graph)
    ctx.state.innerGraph = innerGraph

    syncSubgraphPorts(ctx.node)

    ctx.node.addSettleDependency(async () => {
      await innerGraph.settle()
    })
  },
  onInputChange(name, value, ctx) {
    const inputNode = ctx.state.inputNodes?.get(name as string)
    if (inputNode) {
      inputNode.setInput('value', value)
    }
  },
  onDestroy(ctx) {
    ctx.state.unsubs?.forEach((u) => u())
    ctx.state.unsubs = []
    ctx.state.innerGraph?.nodes.forEach((n) => n.destroy())
  },
}

export function createSubgraphNode(
  options: Partial<
    NodeInitOptions<
      Record<string, unknown>,
      Record<string, unknown>,
      SubgraphData,
      unknown,
      SubgraphState
    >
  > = {},
) {
  return new BaseNode({ ...subgraphNodeConfig, ...options })
}
