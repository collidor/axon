// oxlint-disable typescript/no-explicit-any
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export interface RouterAdapter {
  getCurrentPath(): string
  getQueryParams(): Record<string, any>
  navigateTo(
    path: string,
    options?: { params?: Record<string, any>; query?: Record<string, any>; replace?: boolean },
  ): void
  push?(path: string, options?: { params?: Record<string, any>; query?: Record<string, any> }): void
  rewrite?(
    path: string,
    options?: { params?: Record<string, any>; query?: Record<string, any> },
  ): void
  pop?(delta?: number): void
}

export class MemoryRouterAdapter implements RouterAdapter {
  private _path: string
  private _query: Record<string, any>
  private _history: string[]

  constructor(initialPath: string = '/', initialQuery: Record<string, any> = {}) {
    this._path = initialPath
    this._query = { ...initialQuery }
    this._history = [initialPath]
  }

  getCurrentPath(): string {
    return this._path
  }

  getQueryParams(): Record<string, any> {
    return { ...this._query }
  }

  navigateTo(
    path: string,
    options?: { params?: Record<string, any>; query?: Record<string, any>; replace?: boolean },
  ): void {
    this._path = path
    if (options?.query) {
      this._query = { ...options.query }
    }
    if (options?.replace) {
      this._history[this._history.length - 1] = path
    } else {
      this._history.push(path)
    }
  }

  push(path: string, options?: { params?: Record<string, any>; query?: Record<string, any> }): void {
    this.navigateTo(path, { ...options, replace: false })
  }

  rewrite(path: string, options?: { params?: Record<string, any>; query?: Record<string, any> }): void {
    this.navigateTo(path, { ...options, replace: true })
  }

  pop(delta: number = -1): void {
    const steps = Math.abs(delta)
    for (let i = 0; i < steps; i++) {
      if (this._history.length > 1) {
        this._history.pop()
      }
    }
    this._path = this._history[this._history.length - 1] || '/'
  }
}

const defaultMemoryRouter = new MemoryRouterAdapter()

export function resolveRouter(globalData?: any): RouterAdapter {
  const runtime = globalData?.runtime
  if (runtime) {
    return {
      getCurrentPath: () => runtime.currentRoutePath ?? '/',
      getQueryParams: () => runtime.getCurrentRouteMatch?.()?.query ?? {},
      navigateTo: (p, opts) => runtime.navigateTo?.(p, opts),
      push: (p, opts) =>
        runtime.push
          ? runtime.push(p, opts)
          : runtime.navigateTo?.(p, { ...opts, replace: false }),
      rewrite: (p, opts) =>
        runtime.rewrite
          ? runtime.rewrite(p, opts)
          : runtime.navigateTo?.(p, { ...opts, replace: true }),
      pop: (d) => runtime.pop?.(d),
    }
  }

  if (globalData && typeof globalData === 'object') {
    if (!globalData._memoryRouter) {
      globalData._memoryRouter = new MemoryRouterAdapter()
    }
    return globalData._memoryRouter
  }
  return defaultMemoryRouter
}

// ==========================================
// 1. RouteMatchNodeEngine
// ==========================================
export interface RouteMatchNodeData {
  path?: string // e.g. "/characters/:characterId"
  name?: string
  title?: string
  icon?: string
  [key: string]: unknown
}

export class RouteMatchNodeEngine extends BaseNode<any, any, RouteMatchNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, RouteMatchNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: RouteMatchNodeData = {
      path: options.initialData?.path ?? '/characters/:characterId',
      name: options.initialData?.name ?? 'CharacterDetails',
      title: options.initialData?.title ?? 'Character Sheet',
      icon: options.initialData?.icon ?? '🧙',
      ...options.initialData,
    }

    const routeParams = RouteMatchNodeEngine.extractParams(initialData.path || '')
    const outputs: Record<string, unknown> = {
      matched: Boolean,
      path: String,
      params: Object,
      onMatch: Boolean,
    }
    // Dynamic output ports for each route parameter (e.g. characterId)
    routeParams.forEach((param) => {
      outputs[param] = null
    })

    super(
      {
        ...options,
        nodeType: NODE_TYPES.ROUTE_MATCH,
        inputs: options.inputs ?? {
          incomingPath: String,
          navigateTrigger: Boolean,
        },
        outputs: options.outputs ?? outputs,
        initialData,
        onInputChange: (name, value, ctx) => {
          if (name === 'incomingPath' || (name === 'navigateTrigger' && Boolean(value))) {
            ;(ctx.node as RouteMatchNodeEngine).evaluateMatch(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public static extractParams(pathPattern: string): string[] {
    const matches = pathPattern.match(/:([a-zA-Z0-9_]+)/g)
    if (!matches) return []
    return matches.map((m) => m.substring(1))
  }

  public evaluateMatch(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const incoming = String(inputs.incomingPath || this.globalData?.runtime?.currentRoutePath || '')
    const pattern = this.data.path || '/'

    // Match pattern like /characters/:characterId against /characters/42
    const patternParts = pattern.split('/').filter(Boolean)
    const incomingParts = incoming.split('/').filter(Boolean)

    let isMatch = patternParts.length === incomingParts.length
    const extracted: Record<string, string> = {}

    if (isMatch) {
      for (let i = 0; i < patternParts.length; i++) {
        const pPart = patternParts[i]
        const inPart = incomingParts[i]
        if (pPart.startsWith(':')) {
          const paramName = pPart.substring(1)
          extracted[paramName] = inPart
        } else if (pPart !== inPart) {
          isMatch = false
          break
        }
      }
    }

    // Default fallback if incomingPath was not set: populate default sample param
    if (!incoming && Object.keys(extracted).length === 0) {
      const paramsList = RouteMatchNodeEngine.extractParams(pattern)
      paramsList.forEach((p) => {
        extracted[p] = '1'
      })
      isMatch = true
    }

    this.emitOutput('matched', isMatch)
    this.emitOutput('path', incoming || pattern)
    this.emitOutput('params', extracted)

    // Emit each param individually to dynamic ports (e.g. characterId -> 1)
    for (const [key, val] of Object.entries(extracted)) {
      this.emitOutput(key, val)
    }

    if (isMatch) {
      this.emitOutput('onMatch', true)
      setTimeout(() => {
        this.emitOutput('onMatch', false)
      }, 50)
    }

    return isMatch
  }
}

export function createRouteMatchNode(
  options: Partial<NodeInitOptions<any, any, RouteMatchNodeData, any>> = {},
  globalData?: any,
) {
  return new RouteMatchNodeEngine(options, globalData)
}

// ==========================================
// 2. RouteGuardNodeEngine
// ==========================================
export interface RouteGuardNodeData {
  requiredRole?: string
  redirectTo?: string
  [key: string]: unknown
}

export class RouteGuardNodeEngine extends BaseNode<any, any, RouteGuardNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, RouteGuardNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: RouteGuardNodeData = {
      requiredRole: options.initialData?.requiredRole ?? 'player',
      redirectTo: options.initialData?.redirectTo ?? '/login',
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: NODE_TYPES.ROUTE_GUARD,
        inputs: options.inputs ?? {
          trigger: Boolean,
          condition: Boolean,
          userRole: String,
          requiredRole: String,
        },
        outputs: options.outputs ?? {
          allow: Boolean,
          redirect: Boolean,
          redirectPath: String,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if (name === 'trigger' && Boolean(value)) {
            ;(ctx.node as RouteGuardNodeEngine).evaluateGuard(ctx)
          } else if (name === 'userRole' || name === 'condition' || name === 'requiredRole') {
            ;(ctx.node as RouteGuardNodeEngine).evaluateGuard(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public evaluateGuard(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const condition = inputs.condition !== undefined ? Boolean(inputs.condition) : true
    const userRole = String(inputs.userRole || 'admin')
    const requiredRole = String(inputs.requiredRole || this.data.requiredRole || 'player')

    const allowed =
      condition && (requiredRole === 'any' || userRole === requiredRole || userRole === 'admin')

    this.emitOutput('allow', allowed)
    this.emitOutput('redirect', !allowed)
    if (!allowed) {
      this.emitOutput('redirectPath', this.data.redirectTo || '/login')
    } else {
      this.emitOutput('redirectPath', '')
    }

    return allowed
  }
}

export function createRouteGuardNode(
  options: Partial<NodeInitOptions<any, any, RouteGuardNodeData, any>> = {},
  globalData?: any,
) {
  return new RouteGuardNodeEngine(options, globalData)
}

// ==========================================
// 3. RouteRenderNodeEngine
// ==========================================
export interface RouteRenderNodeData {
  layout?: 'default' | 'sidebar' | 'top-nav' | 'blank' | 'split'
  screenTitle?: string
  componentId?: string
  [key: string]: unknown
}

export class RouteRenderNodeEngine extends BaseNode<any, any, RouteRenderNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, RouteRenderNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: RouteRenderNodeData = {
      layout: options.initialData?.layout ?? 'default',
      screenTitle: options.initialData?.screenTitle ?? 'Screen View',
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: NODE_TYPES.ROUTE_RENDER,
        inputs: options.inputs ?? {
          trigger: Boolean,
          data: null,
          record: null,
          title: String,
        },
        outputs: options.outputs ?? {
          rendered: Boolean,
          activeLayout: String,
          boundData: null,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if (name === 'trigger' && Boolean(value)) {
            ;(ctx.node as RouteRenderNodeEngine).renderScreen(ctx)
          } else if (name === 'data' || name === 'record') {
            ;(ctx.node as RouteRenderNodeEngine).renderScreen(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public renderScreen(ctx?: any): void {
    const inputs = ctx?.inputs ?? this.getInputs()
    const boundData = inputs.record || inputs.data || null

    this.emitOutput('rendered', true)
    this.emitOutput('activeLayout', this.data.layout || 'default')
    this.emitOutput('boundData', boundData)
  }
}

export function createRouteRenderNode(
  options: Partial<NodeInitOptions<any, any, RouteRenderNodeData, any>> = {},
  globalData?: any,
) {
  return new RouteRenderNodeEngine(options, globalData)
}

// ==========================================
// 4. NavigateNodeEngine
// ==========================================
export interface NavigateNodeData {
  targetPath?: string
  replace?: boolean
  [key: string]: unknown
}

export class NavigateNodeEngine extends BaseNode<any, any, NavigateNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, NavigateNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: NavigateNodeData = {
      targetPath: options.initialData?.targetPath ?? '/',
      replace: options.initialData?.replace ?? false,
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: options.nodeType ?? NODE_TYPES.NAVIGATE,
        inputs: options.inputs ?? {
          trigger: Boolean,
          exec: Boolean,
          path: String,
          params: Object,
          page: Number,
          pageSize: Number,
          query: Object,
          replace: Boolean,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          destination: String,
          page: Number,
          pageSize: Number,
          query: Object,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if ((name === 'trigger' || name === 'exec') && Boolean(value)) {
            ;(ctx.node as NavigateNodeEngine).navigate(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public navigate(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const path = inputs.path || this.data.targetPath || '/'
    const params = inputs.params || {}
    const query: Record<string, any> = { ...inputs.query }

    if (inputs.page !== undefined && inputs.page !== null && inputs.page !== '') {
      query.page = Number(inputs.page)
    }
    if (inputs.pageSize !== undefined && inputs.pageSize !== null && inputs.pageSize !== '') {
      query.pageSize = Number(inputs.pageSize)
    }

    const isReplace =
      inputs.replace !== undefined ? Boolean(inputs.replace) : Boolean(this.data.replace)

    const runtime = this.globalData?.runtime
    if (runtime && typeof runtime.navigateTo === 'function') {
      runtime.navigateTo(path, { params, query, replace: isReplace })
    }

    this.emitOutput('destination', path)
    if (query.page !== undefined) this.emitOutput('page', query.page)
    if (query.pageSize !== undefined) this.emitOutput('pageSize', query.pageSize)
    this.emitOutput('query', query)
    this.emitOutput('completed', true)
    setTimeout(() => this.emitOutput('completed', false), 50)
    return true
  }
}

export function createNavigateNode(
  options: Partial<NodeInitOptions<any, any, NavigateNodeData, any>> = {},
  globalData?: any,
) {
  return new NavigateNodeEngine(options, globalData)
}

export function createNavigateRouteNode(
  options: Partial<NodeInitOptions<any, any, NavigateNodeData, any>> = {},
  globalData?: any,
) {
  return new NavigateNodeEngine(
    {
      ...options,
      nodeType: NODE_TYPES.NAVIGATE_ROUTE,
    },
    globalData,
  )
}

// ==========================================
// 5a. RoutePushNodeEngine
// ==========================================
export interface RoutePushNodeData {
  targetPath?: string
  to?: string
  [key: string]: unknown
}

export class RoutePushNodeEngine extends BaseNode<any, any, RoutePushNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, RoutePushNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: RoutePushNodeData = {
      targetPath: options.initialData?.targetPath ?? options.initialData?.to ?? '/',
      to: options.initialData?.to ?? options.initialData?.targetPath ?? '/',
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: options.nodeType ?? NODE_TYPES.ROUTE_PUSH,
        inputs: options.inputs ?? {
          trigger: Boolean,
          exec: Boolean,
          path: String,
          to: String,
          params: Object,
          query: Object,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          destination: String,
          params: Object,
          query: Object,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if ((name === 'trigger' || name === 'exec') && Boolean(value)) {
            ;(ctx.node as RoutePushNodeEngine).executePush(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public executePush(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const path = inputs.path || inputs.to || this.data.targetPath || this.data.to || '/'
    const params = inputs.params || {}
    const query: Record<string, any> = { ...inputs.query }

    const router = resolveRouter(this.globalData)
    if (typeof router.push === 'function') {
      router.push(path, { params, query })
    } else {
      router.navigateTo(path, { params, query, replace: false })
    }

    this.emitOutput('destination', path)
    this.emitOutput('params', params)
    this.emitOutput('query', query)
    this.emitOutput('completed', true)
    setTimeout(() => this.emitOutput('completed', false), 50)
    return true
  }

  public navigate(ctx?: any): boolean {
    return this.executePush(ctx)
  }
}

export function createRoutePushNode(
  options: Partial<NodeInitOptions<any, any, RoutePushNodeData, any>> = {},
  globalData?: any,
) {
  return new RoutePushNodeEngine(options, globalData)
}

// ==========================================
// 5b. RoutePopNodeEngine
// ==========================================
export interface RoutePopNodeData {
  delta?: number
  [key: string]: unknown
}

export class RoutePopNodeEngine extends BaseNode<any, any, RoutePopNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, RoutePopNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: RoutePopNodeData = {
      delta: options.initialData?.delta ?? -1,
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: options.nodeType ?? NODE_TYPES.ROUTE_POP,
        inputs: options.inputs ?? {
          trigger: Boolean,
          exec: Boolean,
          delta: Number,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          delta: Number,
          currentPath: String,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if ((name === 'trigger' || name === 'exec') && Boolean(value)) {
            ;(ctx.node as RoutePopNodeEngine).executePop(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public executePop(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const delta =
      inputs.delta !== undefined && inputs.delta !== null
        ? Number(inputs.delta)
        : Number(this.data.delta ?? -1)

    const router = resolveRouter(this.globalData)
    if (typeof router.pop === 'function') {
      router.pop(delta)
    }

    const currentPath = router.getCurrentPath() || ''

    this.emitOutput('delta', delta)
    this.emitOutput('currentPath', currentPath)
    this.emitOutput('completed', true)
    setTimeout(() => this.emitOutput('completed', false), 50)
    return true
  }

  public pop(ctx?: any): boolean {
    return this.executePop(ctx)
  }
}

export function createRoutePopNode(
  options: Partial<NodeInitOptions<any, any, RoutePopNodeData, any>> = {},
  globalData?: any,
) {
  return new RoutePopNodeEngine(options, globalData)
}

// ==========================================
// 5c. RouteRewriteNodeEngine
// ==========================================
export interface RouteRewriteNodeData {
  targetPath?: string
  to?: string
  [key: string]: unknown
}

export class RouteRewriteNodeEngine extends BaseNode<any, any, RouteRewriteNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, RouteRewriteNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: RouteRewriteNodeData = {
      targetPath: options.initialData?.targetPath ?? options.initialData?.to ?? '/',
      to: options.initialData?.to ?? options.initialData?.targetPath ?? '/',
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: options.nodeType ?? NODE_TYPES.ROUTE_REWRITE,
        inputs: options.inputs ?? {
          trigger: Boolean,
          exec: Boolean,
          path: String,
          to: String,
          params: Object,
          query: Object,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          destination: String,
          params: Object,
          query: Object,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if ((name === 'trigger' || name === 'exec') && Boolean(value)) {
            ;(ctx.node as RouteRewriteNodeEngine).executeRewrite(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public executeRewrite(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const path = inputs.path || inputs.to || this.data.targetPath || this.data.to || '/'
    const params = inputs.params || {}
    const query: Record<string, any> = { ...inputs.query }

    const router = resolveRouter(this.globalData)
    if (typeof router.rewrite === 'function') {
      router.rewrite(path, { params, query })
    } else {
      router.navigateTo(path, { params, query, replace: true })
    }

    this.emitOutput('destination', path)
    this.emitOutput('params', params)
    this.emitOutput('query', query)
    this.emitOutput('completed', true)
    setTimeout(() => this.emitOutput('completed', false), 50)
    return true
  }

  public navigate(ctx?: any): boolean {
    return this.executeRewrite(ctx)
  }
}

export function createRouteRewriteNode(
  options: Partial<NodeInitOptions<any, any, RouteRewriteNodeData, any>> = {},
  globalData?: any,
) {
  return new RouteRewriteNodeEngine(options, globalData)
}

// ==========================================
// 6. ChangePageNodeEngine
// ==========================================
export interface ChangePageNodeData {
  page?: number
  delta?: number
  pageSize?: number
  paramName?: string
  replace?: boolean
  [key: string]: unknown
}

export class ChangePageNodeEngine extends BaseNode<any, any, ChangePageNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, ChangePageNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: ChangePageNodeData = {
      paramName: options.initialData?.paramName ?? 'page',
      replace: options.initialData?.replace ?? false,
      delta: options.initialData?.delta,
      page: options.initialData?.page,
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: NODE_TYPES.CHANGE_PAGE,
        inputs: options.inputs ?? {
          trigger: Boolean,
          page: null,
          delta: null,
          pageSize: null,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          page: Number,
          pageSize: Number,
          query: Object,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if (name === 'trigger' && Boolean(value)) {
            ;(ctx.node as ChangePageNodeEngine).executeChange(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public executeChange(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const paramKey = this.data.paramName || 'page'

    const router = resolveRouter(this.globalData)
    const currentQuery: Record<string, any> = { ...router.getQueryParams() }

    const currentPage = Number(currentQuery[paramKey] ?? 1) || 1

    let newPage = currentPage
    if (inputs.page !== undefined && inputs.page !== null && inputs.page !== '') {
      newPage = Math.max(1, Math.round(Number(inputs.page)))
    } else if (inputs.delta !== undefined && inputs.delta !== null && inputs.delta !== '') {
      newPage = Math.max(1, currentPage + Math.round(Number(inputs.delta)))
    } else if (this.data.page !== undefined && this.data.page !== null) {
      newPage = Math.max(1, Math.round(Number(this.data.page)))
    } else if (this.data.delta !== undefined && this.data.delta !== null) {
      newPage = Math.max(1, currentPage + Math.round(Number(this.data.delta)))
    }

    const newQuery: Record<string, any> = {
      ...currentQuery,
      [paramKey]: newPage,
    }

    let resolvedPageSize: number | undefined
    if (inputs.pageSize !== undefined && inputs.pageSize !== null && inputs.pageSize !== '') {
      resolvedPageSize = Number(inputs.pageSize)
      newQuery.pageSize = resolvedPageSize
    } else if (this.data.pageSize !== undefined) {
      resolvedPageSize = Number(this.data.pageSize)
      newQuery.pageSize = resolvedPageSize
    }

    const isReplace = Boolean(this.data.replace)
    router.navigateTo(router.getCurrentPath() || '/', { query: newQuery, replace: isReplace })

    this.emitOutput('page', newPage)
    if (resolvedPageSize !== undefined) this.emitOutput('pageSize', resolvedPageSize)
    this.emitOutput('query', newQuery)
    this.emitOutput('completed', true)
    setTimeout(() => this.emitOutput('completed', false), 50)
    return true
  }
}

export function createChangePageNode(
  options: Partial<NodeInitOptions<any, any, ChangePageNodeData, any>> = {},
  globalData?: any,
) {
  return new ChangePageNodeEngine(options, globalData)
}

// ==========================================
// 7. SetQueryParamNodeEngine
// ==========================================
export interface SetQueryParamNodeData {
  paramName?: string
  value?: any
  replace?: boolean
  [key: string]: unknown
}

export class SetQueryParamNodeEngine extends BaseNode<any, any, SetQueryParamNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, SetQueryParamNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: SetQueryParamNodeData = {
      paramName: options.initialData?.paramName ?? 'search',
      value: options.initialData?.value,
      replace: options.initialData?.replace ?? true,
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: NODE_TYPES.SET_QUERY_PARAM,
        inputs: options.inputs ?? {
          trigger: Boolean,
          name: null,
          value: null,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          name: String,
          value: null,
          queryParams: Object,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if (name === 'trigger' && Boolean(value)) {
            ;(ctx.node as SetQueryParamNodeEngine).executeSetParam(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public executeSetParam(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const key = String(inputs.name || this.data.paramName || '').trim()
    if (!key) return false

    const rawValue = inputs.value !== undefined ? inputs.value : this.data.value

    const router = resolveRouter(this.globalData)
    const currentQuery: Record<string, any> = { ...router.getQueryParams() }

    const updatedQuery: Record<string, any> = { ...currentQuery }
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      delete updatedQuery[key]
    } else {
      updatedQuery[key] = rawValue
    }

    const isReplace = Boolean(this.data.replace !== false)
    router.navigateTo(router.getCurrentPath() || '/', { query: updatedQuery, replace: isReplace })

    this.emitOutput('name', key)
    this.emitOutput('value', rawValue)
    this.emitOutput('queryParams', updatedQuery)
    this.emitOutput('completed', true)
    setTimeout(() => this.emitOutput('completed', false), 50)
    return true
  }
}

export function createSetQueryParamNode(
  options: Partial<NodeInitOptions<any, any, SetQueryParamNodeData, any>> = {},
  globalData?: any,
) {
  return new SetQueryParamNodeEngine(options, globalData)
}

// ==========================================
// 8. SetQueryParamsNodeEngine
// ==========================================
export interface SetQueryParamsNodeData {
  replace?: boolean
  [key: string]: unknown
}

export class SetQueryParamsNodeEngine extends BaseNode<any, any, SetQueryParamsNodeData, any> {
  constructor(
    options: Partial<NodeInitOptions<any, any, SetQueryParamsNodeData, any>> = {},
    globalData?: any,
  ) {
    const initialData: SetQueryParamsNodeData = {
      replace: options.initialData?.replace ?? true,
      ...options.initialData,
    }

    super(
      {
        ...options,
        nodeType: NODE_TYPES.SET_QUERY_PARAMS,
        inputs: options.inputs ?? {
          trigger: Boolean,
          query: null,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          queryParams: Object,
        },
        initialData,
        onInputChange: (name, value, ctx) => {
          if (name === 'trigger' && Boolean(value)) {
            ;(ctx.node as SetQueryParamsNodeEngine).executeSetParams(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
      },
      globalData,
    )
  }

  public executeSetParams(ctx?: any): boolean {
    const inputs = ctx?.inputs ?? this.getInputs()
    const queryInput = inputs.query && typeof inputs.query === 'object' ? inputs.query : {}

    const router = resolveRouter(this.globalData)
    const currentQuery: Record<string, any> = { ...router.getQueryParams() }

    const updatedQuery: Record<string, any> = { ...currentQuery }
    for (const [k, v] of Object.entries(queryInput)) {
      if (v === null || v === undefined || v === '') {
        delete updatedQuery[k]
      } else {
        updatedQuery[k] = v
      }
    }

    const isReplace = Boolean(this.data.replace !== false)
    router.navigateTo(router.getCurrentPath() || '/', { query: updatedQuery, replace: isReplace })

    this.emitOutput('queryParams', updatedQuery)
    this.emitOutput('completed', true)
    setTimeout(() => this.emitOutput('completed', false), 50)
    return true
  }
}

export function createSetQueryParamsNode(
  options: Partial<NodeInitOptions<any, any, SetQueryParamsNodeData, any>> = {},
  globalData?: any,
) {
  return new SetQueryParamsNodeEngine(options, globalData)
}
