// oxlint-disable typescript/no-explicit-any
import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export interface InvalidateResourceNodeData {
  resourceId?: string
  tableName?: string
  targetType?: 'resource' | 'table' | 'all'
  [key: string]: unknown
}

export interface InvalidateResourceGlobalData {
  cacheStorage?: any
  eventBus?: any
  [key: string]: unknown
}

export class InvalidateResourceNodeEngine extends BaseNode<
  any,
  any,
  InvalidateResourceNodeData,
  InvalidateResourceGlobalData
> {
  constructor(
    options: Partial<
      NodeInitOptions<any, any, InvalidateResourceNodeData, InvalidateResourceGlobalData>
    > = {},
    globalData?: InvalidateResourceGlobalData,
  ) {
    const initialData: InvalidateResourceNodeData = {
      targetType:
        options.initialData?.targetType ?? (options.initialData?.tableName ? 'table' : 'resource'),
      resourceId: options.initialData?.resourceId ?? '',
      tableName: options.initialData?.tableName ?? '',
      ...options.initialData,
    }

    super(
      {
        nodeType: NODE_TYPES.INVALIDATE_RESOURCE,
        inputs: options.inputs ?? {
          trigger: Boolean,
          in: null,
          resourceId: String,
          tableName: String,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          invalidated: Boolean,
          success: Boolean,
          out: null,
        },
        initialData,
        onInit: (ctx) => {
          ctx.node.emitOutput('completed', false)
          ctx.node.emitOutput('invalidated', false)
          ctx.node.emitOutput('success', false)
          ctx.node.emitOutput('out', false)
          if (options.onInit) options.onInit(ctx)
        },
        onDestroy: options.onDestroy,
        onInputChange: (name, value, ctx) => {
          if ((name === 'trigger' || name === 'in') && Boolean(value)) {
            void (ctx.node as InvalidateResourceNodeEngine).executeInvalidate(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
        ...options,
      },
      globalData,
    )
  }

  public executeInvalidate(ctx?: any): { success: boolean; invalidated: boolean } {
    const inputs = ctx?.inputs ?? this.getInputs()
    const resourceId = inputs.resourceId || this.data.resourceId
    const tableName = inputs.tableName || this.data.tableName
    const targetType = this.data.targetType || (tableName ? 'table' : 'resource')

    const cacheStorage =
      this.globalData?.cacheStorage || (this.globalData?.runtime as any)?.cacheStorage

    let didInvalidate = false

    if (cacheStorage) {
      if (targetType === 'table' && tableName) {
        if (typeof cacheStorage.invalidateByTable === 'function') {
          cacheStorage.invalidateByTable(tableName)
          didInvalidate = true
        }
      } else if (targetType === 'all') {
        if (typeof cacheStorage.clear === 'function') {
          cacheStorage.clear()
          didInvalidate = true
        }
      } else if (resourceId) {
        if (typeof cacheStorage.invalidate === 'function') {
          cacheStorage.invalidate(resourceId)
          didInvalidate = true
        }
      } else if (tableName) {
        if (typeof cacheStorage.invalidateByTable === 'function') {
          cacheStorage.invalidateByTable(tableName)
          didInvalidate = true
        }
      }
    }

    const eventBus = this.globalData?.eventBus || (this.globalData?.runtime as any)?.eventBus
    if (eventBus && typeof eventBus.emit === 'function') {
      eventBus.emit('cache:invalidate', { resourceId, tableName, targetType })
      if (tableName) eventBus.emit(`cache:invalidate:${tableName}`, { tableName })
      if (resourceId) eventBus.emit(`cache:invalidate:${resourceId}`, { resourceId })
    }

    this.emitOutput('invalidated', didInvalidate)
    this.emitOutput('success', true)
    this.emitOutput('completed', true)
    this.emitOutput('out', true)

    setTimeout(() => {
      this.emitOutput('completed', false)
      this.emitOutput('invalidated', false)
      this.emitOutput('success', false)
      this.emitOutput('out', false)
    }, 50)

    return { success: true, invalidated: didInvalidate }
  }

  public executeInvalidation(ctx?: any): { success: boolean; invalidated: boolean } {
    return this.executeInvalidate(ctx)
  }
}

export function createInvalidateResourceNode(
  options: Partial<
    NodeInitOptions<any, any, InvalidateResourceNodeData, InvalidateResourceGlobalData>
  > = {},
  globalData?: InvalidateResourceGlobalData,
) {
  return new InvalidateResourceNodeEngine(options, globalData)
}

export interface RefetchResourceNodeData {
  resourceId?: string
  [key: string]: unknown
}

export interface RefetchResourceGlobalData {
  cacheStorage?: any
  eventBus?: any
  evaluator?: any
  [key: string]: unknown
}

export class RefetchResourceNodeEngine extends BaseNode<
  any,
  any,
  RefetchResourceNodeData,
  RefetchResourceGlobalData
> {
  constructor(
    options: Partial<
      NodeInitOptions<any, any, RefetchResourceNodeData, RefetchResourceGlobalData>
    > = {},
    globalData?: RefetchResourceGlobalData,
  ) {
    const initialData: RefetchResourceNodeData = {
      resourceId: options.initialData?.resourceId ?? '',
      ...options.initialData,
    }

    super(
      {
        nodeType: NODE_TYPES.REFETCH_RESOURCE,
        inputs: options.inputs ?? {
          trigger: Boolean,
          in: null,
          resourceId: String,
          params: Object,
        },
        outputs: options.outputs ?? {
          completed: Boolean,
          loading: Boolean,
          data: null,
          error: null,
          out: null,
        },
        initialData,
        onInit: (ctx) => {
          ctx.node.emitOutput('completed', false)
          ctx.node.emitOutput('loading', false)
          ctx.node.emitOutput('data', null)
          ctx.node.emitOutput('error', null)
          ctx.node.emitOutput('out', false)
          if (options.onInit) options.onInit(ctx)
        },
        onDestroy: options.onDestroy,
        onInputChange: (name, value, ctx) => {
          if ((name === 'trigger' || name === 'in') && Boolean(value)) {
            void (ctx.node as RefetchResourceNodeEngine).executeRefetch(ctx)
          }
          if (options.onInputChange) {
            options.onInputChange(name, value, ctx)
          }
        },
        ...options,
      },
      globalData,
    )
  }

  public async executeRefetch(
    ctx?: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const inputs = ctx?.inputs ?? this.getInputs()
    const resourceId = inputs.resourceId || this.data.resourceId
    const params = inputs.params ?? {}

    this.emitOutput('loading', true)
    this.emitOutput('error', null)

    const cacheStorage =
      this.globalData?.cacheStorage || (this.globalData?.runtime as any)?.cacheStorage

    // Purge cached copy so refetch gets live data
    if (cacheStorage && resourceId && typeof cacheStorage.invalidate === 'function') {
      cacheStorage.invalidate(resourceId)
    }

    const eventBus = this.globalData?.eventBus || (this.globalData?.runtime as any)?.eventBus
    if (eventBus && typeof eventBus.emit === 'function') {
      eventBus.emit('resource:refetch', { resourceId, params })
      if (resourceId) eventBus.emit(`resource:refetch:${resourceId}`, { params })
    }

    let resultData: any = null
    let errorMsg: string | null = null

    // If evaluator provided in globalData, run re-evaluation
    if (typeof this.globalData?.evaluator === 'function' && resourceId) {
      try {
        resultData = await this.globalData.evaluator(resourceId, params)
      } catch (err: any) {
        errorMsg = err?.message || String(err)
      }
    }

    this.emitOutput('loading', false)
    if (errorMsg) {
      this.emitOutput('error', errorMsg)
      this.emitOutput('data', null)
    } else {
      this.emitOutput('data', resultData)
    }
    this.emitOutput('completed', true)
    this.emitOutput('out', true)

    setTimeout(() => {
      this.emitOutput('completed', false)
      this.emitOutput('out', false)
    }, 50)

    return {
      success: !errorMsg,
      data: resultData,
      error: errorMsg ?? undefined,
    }
  }
}

export function createRefetchResourceNode(
  options: Partial<
    NodeInitOptions<any, any, RefetchResourceNodeData, RefetchResourceGlobalData>
  > = {},
  globalData?: RefetchResourceGlobalData,
) {
  return new RefetchResourceNodeEngine(options, globalData)
}
