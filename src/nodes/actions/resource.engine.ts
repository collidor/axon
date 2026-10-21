// oxlint-disable typescript/no-explicit-any
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import type { SerializedGraph } from '../../core/serialization'
import { typeMap } from '../../core/constants'
import { NODE_TYPES } from '../nodes.constants'
import type { GroupData } from '../flow/subgraph.engine'

export interface ResourceDefinition {
  id: string
  name: string
  description?: string
  graph: SerializedGraph
  tablesAccessed?: string[]
  ttlMs?: number
  createdAt?: number
  updatedAt?: number
}

export interface ResourceNodeData {
  resourceId?: string
  resourceName?: string
  definition?: ResourceDefinition
  cacheTtlMs?: number
  [key: string]: unknown
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

const FIXED_INPUT_NAMES = new Set(['refresh'])
const FIXED_OUTPUT_NAMES = new Set(['loading', 'error', 'cached'])

/**
 * Dynamically synchronizes a ResourceNodeEngine's input and output ports
 * with the GroupInputNode and GroupOutputNode boundary instances in its ResourceDefinition subgraph.
 */
export function syncResourcePorts(
  node: BaseNode<any, any, ResourceNodeData>,
  definition?: ResourceDefinition | null,
): void {
  const currentInputs = new Set(node.inputNames)
  const currentOutputs = new Set(node.outputNames)

  const desiredInputs = new Map<string, unknown>()
  const desiredOutputs = new Map<string, unknown>()

  const usedInputNames = new Set<string>(FIXED_INPUT_NAMES)
  const usedOutputNames = new Set<string>(FIXED_OUTPUT_NAMES)

  if (definition?.graph?.nodes) {
    for (const innerNode of definition.graph.nodes) {
      const nodeType = innerNode.type || (innerNode as any).nodeType || ''
      const nodeData = (innerNode.data || {}) as unknown as GroupData
      const baseName = nodeData?.name || (nodeType.includes('input') ? 'input' : 'output')
      const type = (nodeData?.type && nodeData.type in typeMap ? typeMap[nodeData.type] : null) || null

      if (nodeType === NODE_TYPES.GROUP_INPUT || nodeType === 'group-input') {
        const uniqueName = dedupeName(baseName, usedInputNames)
        desiredInputs.set(uniqueName, type)
      } else if (nodeType === NODE_TYPES.GROUP_OUTPUT || nodeType === 'group-output') {
        const uniqueName = dedupeName(baseName, usedOutputNames)
        desiredOutputs.set(uniqueName, type)
      }
    }
  }

  // Remove inputs no longer present in definition (preserving fixed operational ports)
  for (const rawName of currentInputs) {
    const name = String(rawName)
    if (!FIXED_INPUT_NAMES.has(name) && !desiredInputs.has(name)) {
      node.removeInput(name)
    }
  }

  // Add new dynamic inputs
  for (const [name, type] of desiredInputs) {
    if (!currentInputs.has(name)) {
      node.addInput(name, type)
    }
  }

  // Remove outputs no longer present in definition (preserving fixed operational ports)
  for (const rawName of currentOutputs) {
    const name = String(rawName)
    if (!FIXED_OUTPUT_NAMES.has(name) && !desiredOutputs.has(name)) {
      node.removeOutput(name)
    }
  }

  // Add new dynamic outputs
  for (const [name, type] of desiredOutputs) {
    if (!currentOutputs.has(name)) {
      node.addOutput(name, type)
    }
  }
}

export const resourceNodeConfig: NodeInitOptions<
  Record<string, unknown>,
  Record<string, unknown>,
  ResourceNodeData
> = {
  nodeType: NODE_TYPES.RESOURCE,
  inputs: {
    refresh: Boolean,
  },
  outputs: {
    loading: Boolean,
    error: null,
    cached: Boolean,
  },
  initialData: {
    resourceId: '',
    resourceName: 'Resource',
  },
  onInit(ctx) {
    if (ctx.data?.definition) {
      syncResourcePorts(ctx.node, ctx.data.definition)
    }
  },
}

export class ResourceNodeEngine extends BaseNode<any, any, ResourceNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, ResourceNodeData>> = {}) {
    const initialData: ResourceNodeData = {
      ...resourceNodeConfig.initialData,
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.RESOURCE,
      inputs: {
        ...resourceNodeConfig.inputs,
        ...options.inputs,
      },
      outputs: {
        ...resourceNodeConfig.outputs,
        ...options.outputs,
      },
      initialData,
      onInit: (ctx) => {
        resourceNodeConfig.onInit?.(ctx as any)
        options.onInit?.(ctx as any)
      },
      ...options,
    })

    if (this.data?.definition) {
      syncResourcePorts(this, this.data.definition)
    }
  }
}

export function createResourceNode(
  options: Partial<NodeInitOptions<any, any, ResourceNodeData>> = {},
) {
  return new ResourceNodeEngine(options)
}
