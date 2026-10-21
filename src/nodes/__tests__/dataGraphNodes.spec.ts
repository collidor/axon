import { describe, it, expect } from 'vitest'
import {
  createTableQueryNode,
  createTableJoinNode,
  createRouteParamNode,
  createQueryParamNode,
  createQueryParamsNode,
  createRouteInfoNode,
  createUrlLocationNode,
  createArrayTransformNode,
  createObjectTransformNode,
  createRouteScopeNode,
  createPageRouterDataNode,
} from '../data/dataGraph.engine'
import { NODE_TYPES } from '../nodes.constants'
import { nodeRegistry } from '../../core/nodeRegistry'
import { registerCoreNodes } from '../nodeLibrary'

describe('dataGraphNodes', () => {
  it('registers all data graph node engines in nodeRegistry', () => {
    registerCoreNodes(nodeRegistry)
    expect(nodeRegistry.types).toContain(NODE_TYPES.TABLE_QUERY)
    expect(nodeRegistry.types).toContain(NODE_TYPES.ROUTE_PARAM)
    expect(nodeRegistry.types).toContain(NODE_TYPES.QUERY_PARAM)
    expect(nodeRegistry.types).toContain(NODE_TYPES.QUERY_PARAMS)
    expect(nodeRegistry.types).toContain(NODE_TYPES.ROUTE_INFO)
    expect(nodeRegistry.types).toContain(NODE_TYPES.URL_LOCATION)
    expect(nodeRegistry.types).toContain(NODE_TYPES.ARRAY_TRANSFORM)
    expect(nodeRegistry.types).toContain(NODE_TYPES.OBJECT_TRANSFORM)
    expect(nodeRegistry.types).toContain(NODE_TYPES.ROUTE_SCOPE)
  })

  it('initializes TableQueryNodeEngine with input and output ports', () => {
    const node = createTableQueryNode({ initialData: { tableName: 'monsters', filterField: 'cr' } })
    expect(node.nodeType).toBe(NODE_TYPES.TABLE_QUERY)
    expect(node.data.tableName).toBe('monsters')
    expect(node.data.filterField).toBe('cr')
    expect(node.inputNames).toContain('filterValue')
    expect(node.outputNames).toContain('records')
    expect(node.outputNames).toContain('first')
  })

  it('initializes TableJoinNodeEngine with join configuration and ports', () => {
    const node = createTableJoinNode({
      initialData: {
        joinTable: 'attributes',
        sourceField: 'attribute_id',
        targetField: 'id',
        asProperty: 'attributes',
      },
    })
    expect(node.nodeType).toBe(NODE_TYPES.TABLE_JOIN)
    expect(node.data.joinTable).toBe('attributes')
    expect(node.data.sourceField).toBe('attribute_id')
    expect(node.data.targetField).toBe('id')
    expect(node.data.asProperty).toBe('attributes')
    expect(node.inputNames).toContain('sourceRecords')
    expect(node.outputNames).toContain('records')
    expect(node.outputNames).toContain('first')
    expect(node.outputNames).toContain('sql')
  })

  it('initializes RouteParamNodeEngine with default param data', () => {
    const node = createRouteParamNode({
      initialData: { paramName: 'monsterId', defaultValue: 'goblin' },
    })
    expect(node.nodeType).toBe(NODE_TYPES.ROUTE_PARAM)
    expect(node.data.paramName).toBe('monsterId')
    expect(node.outputNames).toContain('value')
    expect(node.outputNames).toContain('all')
  })

  it('initializes QueryParamNodeEngine with name input and single value output', () => {
    const node = createQueryParamNode({
      initialData: { paramName: 'page', defaultValue: '1' },
    })
    expect(node.nodeType).toBe(NODE_TYPES.QUERY_PARAM)
    expect(node.data.paramName).toBe('page')
    expect(node.data.defaultValue).toBe('1')
    expect(node.data.paramType).toBe('string')
    expect(node.inputNames).toContain('name')
    expect(node.outputNames).toEqual(['value'])
  })

  it('initializes QueryParamsNodeEngine with queryParams output', () => {
    const node = createQueryParamsNode()
    expect(node.nodeType).toBe(NODE_TYPES.QUERY_PARAMS)
    expect(node.outputNames).toContain('queryParams')
  })

  it('initializes RouteInfoNodeEngine with path, fullPath, and name outputs', () => {
    const node = createRouteInfoNode({
      initialData: { routePath: '/monsters/:id', routeName: 'MonsterDetail' },
    })
    expect(node.nodeType).toBe(NODE_TYPES.ROUTE_INFO)
    expect(node.data.routePath).toBe('/monsters/:id')
    expect(node.data.routeName).toBe('MonsterDetail')
    expect(node.outputNames).toContain('path')
    expect(node.outputNames).toContain('fullPath')
    expect(node.outputNames).toContain('name')
  })

  it('initializes UrlLocationNodeEngine with URL parts outputs', () => {
    const node = createUrlLocationNode()
    expect(node.nodeType).toBe(NODE_TYPES.URL_LOCATION)
    expect(node.outputNames).toContain('pathname')
    expect(node.outputNames).toContain('search')
    expect(node.outputNames).toContain('hash')
    expect(node.outputNames).toContain('origin')
    expect(node.outputNames).toContain('href')
  })

  it('initializes ArrayTransformNodeEngine with operation settings', () => {
    const node = createArrayTransformNode({
      initialData: { operation: 'sort', sortKey: 'level', order: 'desc' },
    })
    expect(node.nodeType).toBe(NODE_TYPES.ARRAY_TRANSFORM)
    expect(node.data.operation).toBe('sort')
    expect(node.data.sortKey).toBe('level')
    expect(node.inputNames).toContain('array')
    expect(node.outputNames).toContain('result')
  })

  it('initializes ObjectTransformNodeEngine with merge and pick options', () => {
    const node = createObjectTransformNode({
      initialData: { operation: 'pick', fields: ['name', 'hp'] },
    })
    expect(node.nodeType).toBe(NODE_TYPES.OBJECT_TRANSFORM)
    expect(node.data.fields).toEqual(['name', 'hp'])
    expect(node.inputNames).toContain('object')
    expect(node.outputNames).toContain('result')
  })

  it('initializes RouteScopeNodeEngine with scope binder ports', () => {
    const node = createRouteScopeNode({ initialData: { scopeName: 'MonsterSheet' } })
    expect(node.nodeType).toBe(NODE_TYPES.ROUTE_SCOPE)
    expect(node.data.scopeName).toBe('MonsterSheet')
    expect(node.outputNames).toContain('scope')
  })

  it('initializes PageRouterDataNodeEngine with dynamic query params and struct ports', () => {
    const node = createPageRouterDataNode({
      initialData: {
        title: 'Monsters Router',
        structFields: [{ name: 'monster', type: 'struct' }],
        urlParams: ['id'],
        queryParams: ['page', { name: 'pageSize', defaultValue: 20 }],
      },
    })
    expect(node.nodeType).toBe(NODE_TYPES.PAGE_ROUTER_DATA)
    expect(node.outputNames).toContain('params')
    expect(node.outputNames).toContain('queryParams')
    expect(node.outputNames).toContain('url')
    expect(node.outputNames).toContain('monster')
    expect(node.outputNames).toContain('id')
    expect(node.outputNames).toContain('page')
    expect(node.outputNames).toContain('pageSize')
    expect(node.outputNames).toContain('query:page')
  })
})
