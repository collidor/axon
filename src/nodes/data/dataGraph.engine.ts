import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

// --- 1. Table Query Node Engine ---
export interface TableQueryNodeData {
  tableName?: string
  filterField?: string
  filterOperator?: string
  filterValue?: any
  foreignKeyJoin?: string
  page?: number
  pageSize?: number
  limit?: number
  offset?: number
  enablePagination?: boolean
  fallbackRecord?: Record<string, any>
  [key: string]: unknown
}

export class TableQueryNodeEngine extends BaseNode<any, any, TableQueryNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, TableQueryNodeData>> = {}) {
    const initialData: TableQueryNodeData = {
      tableName: options.initialData?.tableName ?? '',
      filterField: options.initialData?.filterField ?? 'id',
      filterOperator: options.initialData?.filterOperator ?? '==',
      page: options.initialData?.page ?? 1,
      pageSize: options.initialData?.pageSize ?? 20,
      limit: options.initialData?.limit ?? 20,
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.TABLE_QUERY,
      inputs: options.inputs ?? {
        param: null,
        filterValue: null,
        filter: null,
        page: Number,
        pageSize: Number,
        limit: Number,
        offset: Number,
        trigger: Boolean,
      },
      outputs: options.outputs ?? {
        records: Array,
        first: null,
        count: Number,
        total: Number,
        totalCount: Number,
        page: Number,
        pageSize: Number,
        totalPages: Number,
        hasNextPage: Boolean,
        hasPrevPage: Boolean,
        loading: Boolean,
        error: null,
      },
      initialData,
      ...options,
    })
  }
}

export function createTableQueryNode(
  options?: Partial<NodeInitOptions<any, any, TableQueryNodeData>>,
) {
  return new TableQueryNodeEngine(options)
}

// --- 1b. Table Join Node Engine ---
export interface TableJoinNodeData {
  joinTable?: string
  relationshipId?: string
  sourceField?: string
  targetField?: string
  joinType?: 'LEFT JOIN' | 'INNER JOIN'
  asProperty?: string
  cardinality?: 'one-to-one' | 'one-to-many'
  [key: string]: unknown
}

export class TableJoinNodeEngine extends BaseNode<any, any, TableJoinNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, TableJoinNodeData>> = {}) {
    const initialData: TableJoinNodeData = {
      joinTable: options.initialData?.joinTable ?? 'attributes',
      sourceField: options.initialData?.sourceField ?? 'attribute_id',
      targetField: options.initialData?.targetField ?? 'id',
      joinType: options.initialData?.joinType ?? 'LEFT JOIN',
      asProperty: options.initialData?.asProperty ?? 'attributes',
      cardinality: options.initialData?.cardinality ?? 'one-to-one',
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.TABLE_JOIN,
      inputs: options.inputs ?? {
        sourceRecords: Array,
        records: Array,
        sourceFirst: null,
        first: null,
        joinValue: null,
      },
      outputs: options.outputs ?? {
        records: Array,
        first: null,
        count: Number,
        sql: String,
      },
      initialData,
      ...options,
    })
  }
}

export function createTableJoinNode(
  options?: Partial<NodeInitOptions<any, any, TableJoinNodeData>>,
) {
  return new TableJoinNodeEngine(options)
}

// --- 2. Route Param Node Engine ---
export interface RouteParamNodeData {
  paramName?: string
  defaultValue?: any
  [key: string]: unknown
}

export class RouteParamNodeEngine extends BaseNode<any, any, RouteParamNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, RouteParamNodeData>> = {}) {
    const initialData: RouteParamNodeData = {
      paramName: options.initialData?.paramName ?? '',
      defaultValue: options.initialData?.defaultValue ?? '',
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.ROUTE_PARAM,
      inputs: options.inputs ?? {},
      outputs: options.outputs ?? {
        value: null,
        all: null,
      },
      initialData,
      ...options,
    })
  }
}

export function createRouteParamNode(
  options?: Partial<NodeInitOptions<any, any, RouteParamNodeData>>,
) {
  return new RouteParamNodeEngine(options)
}

// --- 2b. Query Param Node Engine ---
export interface QueryParamNodeData {
  paramName?: string
  defaultValue?: any
  paramType?: string
  [key: string]: unknown
}

export class QueryParamNodeEngine extends BaseNode<any, any, QueryParamNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, QueryParamNodeData>> = {}) {
    const initialData: QueryParamNodeData = {
      paramName: options.initialData?.paramName ?? 'page',
      defaultValue: options.initialData?.defaultValue ?? '',
      paramType: 'string',
      ...options.initialData,
    }

    super({
      ...options,
      nodeType: NODE_TYPES.QUERY_PARAM,
      inputs: options.inputs ?? {
        name: null,
      },
      outputs: options.outputs ?? {
        value: null,
      },
      initialData,
    })
  }
}

export function createQueryParamNode(
  options?: Partial<NodeInitOptions<any, any, QueryParamNodeData>>,
) {
  return new QueryParamNodeEngine(options)
}

// --- 2c. All Query Params Node Engine ---
export interface QueryParamsNodeData {
  [key: string]: unknown
}

export class QueryParamsNodeEngine extends BaseNode<any, any, QueryParamsNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, QueryParamsNodeData>> = {}) {
    const initialData: QueryParamsNodeData = {
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.QUERY_PARAMS,
      inputs: options.inputs ?? {},
      outputs: options.outputs ?? {
        queryParams: null,
      },
      initialData,
      ...options,
    })
  }
}

export function createQueryParamsNode(
  options?: Partial<NodeInitOptions<any, any, QueryParamsNodeData>>,
) {
  return new QueryParamsNodeEngine(options)
}

// --- 2d. Route Info Node Engine ---
export interface RouteInfoNodeData {
  routePath?: string
  routeName?: string
  [key: string]: unknown
}

export class RouteInfoNodeEngine extends BaseNode<any, any, RouteInfoNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, RouteInfoNodeData>> = {}) {
    const initialData: RouteInfoNodeData = {
      routePath: options.initialData?.routePath ?? '',
      routeName: options.initialData?.routeName ?? '',
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.ROUTE_INFO,
      inputs: options.inputs ?? {},
      outputs: options.outputs ?? {
        path: null,
        fullPath: null,
        name: null,
      },
      initialData,
      ...options,
    })
  }
}

export function createRouteInfoNode(
  options?: Partial<NodeInitOptions<any, any, RouteInfoNodeData>>,
) {
  return new RouteInfoNodeEngine(options)
}

// --- 2e. URL Location Node Engine ---
export interface UrlLocationNodeData {
  [key: string]: unknown
}

export class UrlLocationNodeEngine extends BaseNode<any, any, UrlLocationNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, UrlLocationNodeData>> = {}) {
    const initialData: UrlLocationNodeData = {
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.URL_LOCATION,
      inputs: options.inputs ?? {},
      outputs: options.outputs ?? {
        pathname: null,
        search: null,
        hash: null,
        origin: null,
        href: null,
      },
      initialData,
      ...options,
    })
  }
}

export function createUrlLocationNode(
  options?: Partial<NodeInitOptions<any, any, UrlLocationNodeData>>,
) {
  return new UrlLocationNodeEngine(options)
}

// --- 3. Array Transform Node Engine ---
export interface ArrayTransformNodeData {
  operation?: 'filter' | 'map' | 'sort' | 'aggregate'
  field?: string
  operator?: string
  targetValue?: any
  sortKey?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
  [key: string]: unknown
}

export class ArrayTransformNodeEngine extends BaseNode<any, any, ArrayTransformNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, ArrayTransformNodeData>> = {}) {
    const initialData: ArrayTransformNodeData = {
      operation: options.initialData?.operation ?? 'filter',
      field: options.initialData?.field ?? 'is_equipped',
      operator: options.initialData?.operator ?? '==',
      targetValue: options.initialData?.targetValue ?? true,
      sortKey: options.initialData?.sortKey ?? 'id',
      order: options.initialData?.order ?? 'asc',
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.ARRAY_TRANSFORM,
      inputs: options.inputs ?? {
        array: Array,
        targetValue: null,
      },
      outputs: options.outputs ?? {
        result: Array,
        count: Number,
      },
      initialData,
      ...options,
    })
  }
}

export function createArrayTransformNode(
  options?: Partial<NodeInitOptions<any, any, ArrayTransformNodeData>>,
) {
  return new ArrayTransformNodeEngine(options)
}

// --- 4. Object Transform Node Engine ---
export interface ObjectTransformNodeData {
  operation?: 'merge' | 'pick' | 'pluck'
  field?: string
  fields?: string[]
  aliases?: Record<string, string>
  defaults?: Record<string, any>
  [key: string]: unknown
}

export class ObjectTransformNodeEngine extends BaseNode<any, any, ObjectTransformNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, ObjectTransformNodeData>> = {}) {
    const initialData: ObjectTransformNodeData = {
      operation: options.initialData?.operation ?? 'pluck',
      field: options.initialData?.field ?? 'attribute_id',
      fields: options.initialData?.fields ?? [],
      aliases: options.initialData?.aliases ?? {},
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.OBJECT_TRANSFORM,
      inputs: options.inputs ?? {
        object: null,
        a: null,
        b: null,
      },
      outputs: options.outputs ?? {
        result: null,
        value: null,
      },
      initialData,
      ...options,
    })
  }
}

export function createObjectTransformNode(
  options?: Partial<NodeInitOptions<any, any, ObjectTransformNodeData>>,
) {
  return new ObjectTransformNodeEngine(options)
}

// --- 5. Route Scope Output Node Engine ---
export interface RouteScopeInputField {
  name: string
  type: 'struct' | 'primitive' | 'object' | 'array' | 'string' | 'number' | 'boolean' | 'any'
}

export interface RouteScopeNodeData {
  scopeName?: string
  fields?: RouteScopeInputField[]
  staticScope?: Record<string, any>
  [key: string]: unknown
}

export class RouteScopeNodeEngine extends BaseNode<any, any, RouteScopeNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, RouteScopeNodeData>> = {}) {
    const initialData: RouteScopeNodeData = {
      scopeName: options.initialData?.scopeName ?? 'Route Scope',
      ...options.initialData,
    }

    const dynamicInputs: Record<string, any> = { ...options.inputs }
    if (initialData.fields && Array.isArray(initialData.fields)) {
      for (const f of initialData.fields) {
        if (f && f.name) dynamicInputs[f.name] = null
      }
    }

    super({
      nodeType: NODE_TYPES.ROUTE_SCOPE,
      inputs: dynamicInputs,
      outputs: options.outputs ?? {
        scope: null,
      },
      initialData,
      ...options,
    })
  }
}

export function createRouteScopeNode(
  options?: Partial<NodeInitOptions<any, any, RouteScopeNodeData>>,
) {
  return new RouteScopeNodeEngine(options)
}

// --- 6. Page Router & URL Data Node Engine ---
export interface PageRouterDataField {
  name: string
  type: string
}

export interface PageRouterQueryParam {
  name: string
  defaultValue?: any
  type?: 'string' | 'number' | 'boolean'
}

export interface PageRouterDataNodeData {
  title?: string
  routePath?: string
  structFields?: PageRouterDataField[]
  urlParams?: string[]
  queryParams?: Array<string | PageRouterQueryParam>
  [key: string]: unknown
}

export class PageRouterDataNodeEngine extends BaseNode<any, any, PageRouterDataNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, PageRouterDataNodeData>> = {}) {
    const initialData: PageRouterDataNodeData = {
      title: options.initialData?.title ?? 'Page Router & URL Data',
      routePath: options.initialData?.routePath ?? '',
      structFields: options.initialData?.structFields ?? [],
      urlParams: options.initialData?.urlParams ?? [],
      queryParams: options.initialData?.queryParams ?? [],
      ...options.initialData,
    }

    const dynamicOutputs: Record<string, any> = {
      params: Object,
      queryParams: Object,
      url: String,
      scope: Object,
      ...options.outputs,
    }

    if (initialData.structFields && Array.isArray(initialData.structFields)) {
      for (const f of initialData.structFields) {
        if (f && f.name) dynamicOutputs[f.name] = null
      }
    }

    if (initialData.urlParams && Array.isArray(initialData.urlParams)) {
      for (const p of initialData.urlParams) {
        if (p) dynamicOutputs[p] = String
      }
    }

    if (initialData.queryParams && Array.isArray(initialData.queryParams)) {
      for (const q of initialData.queryParams) {
        const qName = typeof q === 'string' ? q : q?.name
        if (qName) {
          const isNum =
            ['page', 'pageSize', 'limit', 'offset'].includes(qName) ||
            (typeof q !== 'string' && q.type === 'number')
          dynamicOutputs[qName] = isNum ? Number : String
          dynamicOutputs[`query:${qName}`] = isNum ? Number : String
        }
      }
    }

    super({
      nodeType: NODE_TYPES.PAGE_ROUTER_DATA,
      inputs: options.inputs ?? {},
      outputs: dynamicOutputs,
      initialData,
      ...options,
    })
  }
}

export function createPageRouterDataNode(
  options?: Partial<NodeInitOptions<any, any, PageRouterDataNodeData>>,
) {
  return new PageRouterDataNodeEngine(options)
}

// --- 7. Component Output Node Engine (Undeletable / Control Slots & Tabs) ---
export interface ComponentOutputSlot {
  name: string
  type?: string
  label?: string
  isTabSlot?: boolean
  tabId?: string
}

export interface ComponentOutputEvent {
  name: string
  label?: string
  type?: string
}

export interface ComponentOutputNodeData {
  title?: string
  undeletable?: boolean
  slots?: ComponentOutputSlot[]
  ports?: ComponentOutputSlot[]
  events?: ComponentOutputEvent[]
  values?: Record<string, any>
  componentType?: string
  [key: string]: unknown
}

export class ComponentOutputNodeEngine extends BaseNode<any, any, ComponentOutputNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, ComponentOutputNodeData>> = {}) {
    const initialData: ComponentOutputNodeData = {
      title: options.initialData?.title ?? 'Component Output',
      undeletable: true,
      slots: options.initialData?.slots ?? [
        { name: 'visible', type: 'boolean', label: 'Visible' },
        { name: 'disabled', type: 'boolean', label: 'Disabled' },
      ],
      values: options.initialData?.values ?? {},
      ...options.initialData,
    }

    const dynamicInputs: Record<string, any> = {}
    const slotList = initialData.slots || initialData.ports || []
    for (const s of slotList) {
      if (s && s.name) dynamicInputs[s.name] = null
    }

    const dynamicOutputs: Record<string, any> = {
      // Trigger out ports for events
      click: Boolean,
      submit: Boolean,
      reset: Boolean,
      cancel: Boolean,
      change: Boolean,
      input: Boolean,
      tabChange: Boolean,
      itemClick: Boolean,
      pageChange: Boolean,
      nextPage: Boolean,
      prevPage: Boolean,
      sort: Boolean,
      rowClick: Boolean,
      selectionChange: Boolean,
      // Event payload data ports
      page: Number,
      pageSize: Number,
      totalPages: Number,
      total: Number,
      totalItems: Number,
      sortBy: String,
      sortDirection: String,
      row: Object,
      item: Object,
      values: Object,
      value: null,
      activeTab: String,
      formula: String,
      selectedKeys: Array,
      selectedRows: Array,
      ...options.outputs,
    }

    if (initialData.events && Array.isArray(initialData.events)) {
      for (const ev of initialData.events) {
        if (ev && ev.name && !(ev.name in dynamicOutputs)) {
          dynamicOutputs[ev.name] =
            ev.type === 'number' ? Number : ev.type === 'object' ? Object : Boolean
        }
      }
    }

    super({
      nodeType: NODE_TYPES.COMPONENT_OUTPUT,
      inputs: {
        visible: Boolean,
        disabled: Boolean,
        activeTab: String,
        ...dynamicInputs,
        ...options.inputs,
      },
      outputs: dynamicOutputs,
      initialData,
      ...options,
    })
  }

  public triggerEvent(eventName: string, payload: any = {}): void {
    const outputs = this.outputDefinition
    if (eventName in outputs) {
      this.emitOutput(eventName, true)
    }
    if (payload !== undefined && payload !== null) {
      if (typeof payload === 'object') {
        for (const [k, v] of Object.entries(payload)) {
          if (k in outputs) {
            this.emitOutput(k, v)
          }
        }
      } else {
        if (eventName === 'pageChange' || eventName === 'nextPage' || eventName === 'prevPage') {
          if ('page' in outputs) this.emitOutput('page', payload)
        } else if (eventName === 'sort') {
          if ('sortBy' in outputs) this.emitOutput('sortBy', payload)
        } else if (eventName === 'rowClick') {
          if ('row' in outputs) this.emitOutput('row', payload)
        } else if (eventName === 'itemClick') {
          if ('item' in outputs) this.emitOutput('item', payload)
        } else if (eventName === 'change' || eventName === 'input') {
          if ('value' in outputs) this.emitOutput('value', payload)
        } else if (eventName === 'tabChange') {
          if ('activeTab' in outputs) this.emitOutput('activeTab', payload)
        }
      }
    }
  }
}

export function createComponentOutputNode(
  options?: Partial<NodeInitOptions<any, any, ComponentOutputNodeData>>,
) {
  return new ComponentOutputNodeEngine(options)
}

// --- 8. Table Component Node Engine ---
export interface TableComponentNodeData {
  title?: string
  tableName?: string
  pagination?: boolean
  page?: number
  pageSize?: number
  values?: Record<string, any>
  slots?: ComponentOutputSlot[]
  events?: ComponentOutputEvent[]
  [key: string]: unknown
}

export class TableComponentNodeEngine extends BaseNode<any, any, TableComponentNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, TableComponentNodeData>> = {}) {
    const initialData: TableComponentNodeData = {
      title: options.initialData?.title ?? 'Table Component',
      pagination: true,
      page: 1,
      pageSize: 5,
      ...options.initialData,
    }

    super({
      nodeType: NODE_TYPES.TABLE_COMPONENT,
      inputs: options.inputs ?? {
        data: Array,
        page: Number,
        pageSize: Number,
        total: Number,
        visible: Boolean,
        disabled: Boolean,
        sortBy: String,
        sortDirection: String,
      },
      outputs: options.outputs ?? {
        pageChange: Boolean,
        nextPage: Boolean,
        prevPage: Boolean,
        sort: Boolean,
        rowClick: Boolean,
        selectionChange: Boolean,
        page: Number,
        pageSize: Number,
        totalPages: Number,
        total: Number,
        sortBy: String,
        sortDirection: String,
        row: Object,
        selectedKeys: Array,
        selectedRows: Array,
      },
      initialData,
      ...options,
    })
  }

  public triggerEvent(eventName: string, payload: any = {}): void {
    const outputs = this.outputDefinition
    if (eventName in outputs) {
      this.emitOutput(eventName, true)
    }
    if (payload !== undefined && payload !== null) {
      if (typeof payload === 'object') {
        for (const [k, v] of Object.entries(payload)) {
          if (k in outputs) {
            this.emitOutput(k, v)
          }
        }
      } else {
        if (eventName === 'pageChange' || eventName === 'nextPage' || eventName === 'prevPage') {
          if ('page' in outputs) this.emitOutput('page', payload)
        } else if (eventName === 'sort') {
          if ('sortBy' in outputs) this.emitOutput('sortBy', payload)
        } else if (eventName === 'rowClick') {
          if ('row' in outputs) this.emitOutput('row', payload)
        }
      }
    }
  }
}

export function createTableComponentNode(
  options?: Partial<NodeInitOptions<any, any, TableComponentNodeData>>,
) {
  return new TableComponentNodeEngine(options)
}
