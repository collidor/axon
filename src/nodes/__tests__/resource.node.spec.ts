import { describe, it, expect } from 'vitest'
import {
  createResourceNode,
  syncResourcePorts,
  NODE_TYPES,
  type ResourceDefinition,
} from '../index'

describe('ResourceNodeEngine', () => {
  it('instantiates with default nodeType and operational ports', () => {
    const node = createResourceNode()
    expect(node.nodeType).toBe(NODE_TYPES.RESOURCE)
    expect(node.inputNames).toContain('refresh')
    expect(node.outputNames).toContain('loading')
    expect(node.outputNames).toContain('error')
    expect(node.outputNames).toContain('cached')
  })

  it('synchronizes dynamic ports from inner subgraph boundary nodes', () => {
    const definition: ResourceDefinition = {
      id: 'res_characters',
      name: 'Characters Query',
      graph: {
        nodes: [
          {
            id: 'in-1',
            type: NODE_TYPES.GROUP_INPUT,
            x: 0,
            y: 0,
            data: { name: 'role', type: 'string' },
          },
          {
            id: 'in-2',
            type: NODE_TYPES.GROUP_INPUT,
            x: 0,
            y: 0,
            data: { name: 'page', type: 'number' },
          },
          {
            id: 'out-1',
            type: NODE_TYPES.GROUP_OUTPUT,
            x: 0,
            y: 0,
            data: { name: 'records', type: 'array' },
          },
          {
            id: 'out-2',
            type: NODE_TYPES.GROUP_OUTPUT,
            x: 0,
            y: 0,
            data: { name: 'totalCount', type: 'number' },
          },
        ],
        edges: [],
      },
    }

    const node = createResourceNode({
      initialData: {
        resourceId: 'res_characters',
        definition,
      },
    })

    syncResourcePorts(node, definition)

    // Dynamic inputs + default 'refresh'
    expect(node.inputNames).toContain('role')
    expect(node.inputNames).toContain('page')
    expect(node.inputNames).toContain('refresh')

    // Dynamic outputs + default 'loading', 'error', 'cached'
    expect(node.outputNames).toContain('records')
    expect(node.outputNames).toContain('totalCount')
    expect(node.outputNames).toContain('loading')
    expect(node.outputNames).toContain('error')
    expect(node.outputNames).toContain('cached')
  })

  it('updates dynamic ports when definition subgraph changes', () => {
    const node = createResourceNode()

    const def1: ResourceDefinition = {
      id: 'res_1',
      name: 'Res 1',
      graph: {
        nodes: [
          {
            id: '1',
            type: NODE_TYPES.GROUP_INPUT,
            x: 0,
            y: 0,
            data: { name: 'oldParam', type: 'string' },
          },
          {
            id: '2',
            type: NODE_TYPES.GROUP_OUTPUT,
            x: 0,
            y: 0,
            data: { name: 'oldOutput', type: 'string' },
          },
        ],
        edges: [],
      },
    }

    syncResourcePorts(node, def1)
    expect(node.inputNames).toContain('oldParam')
    expect(node.outputNames).toContain('oldOutput')

    const def2: ResourceDefinition = {
      id: 'res_1',
      name: 'Res 1',
      graph: {
        nodes: [
          {
            id: '3',
            type: NODE_TYPES.GROUP_INPUT,
            x: 0,
            y: 0,
            data: { name: 'newParam', type: 'number' },
          },
          {
            id: '4',
            type: NODE_TYPES.GROUP_OUTPUT,
            x: 0,
            y: 0,
            data: { name: 'newOutput', type: 'array' },
          },
        ],
        edges: [],
      },
    }

    syncResourcePorts(node, def2)
    expect(node.inputNames).toContain('newParam')
    expect(node.inputNames).not.toContain('oldParam')
    expect(node.inputNames).toContain('refresh') // Fixed port preserved

    expect(node.outputNames).toContain('newOutput')
    expect(node.outputNames).not.toContain('oldOutput')
    expect(node.outputNames).toContain('loading') // Fixed ports preserved
  })

  it('handles empty or missing definition without throwing', () => {
    const node = createResourceNode()
    expect(() => syncResourcePorts(node, undefined)).not.toThrow()
    expect(() => syncResourcePorts(node, null as unknown as ResourceDefinition)).not.toThrow()
    expect(() =>
      syncResourcePorts(node, { id: 'x', name: 'X', graph: { nodes: [], edges: [] } }),
    ).not.toThrow()

    expect(node.inputNames).toContain('refresh')
    expect(node.outputNames).toContain('loading')
  })

  it('deduplicates port names if multiple boundary nodes have the same name', () => {
    const def: ResourceDefinition = {
      id: 'res_dup',
      name: 'Res Dup',
      graph: {
        nodes: [
          {
            id: '1',
            type: NODE_TYPES.GROUP_INPUT,
            x: 0,
            y: 0,
            data: { name: 'query', type: 'string' },
          },
          {
            id: '2',
            type: NODE_TYPES.GROUP_INPUT,
            x: 0,
            y: 0,
            data: { name: 'query', type: 'string' },
          },
        ],
        edges: [],
      },
    }

    const node = createResourceNode()
    syncResourcePorts(node, def)

    expect(node.inputNames).toContain('query')
    expect(node.inputNames).toContain('query_1')
  })
})
