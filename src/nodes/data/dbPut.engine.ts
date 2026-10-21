import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export interface DbPutNodeData {
  tableName?: string
  structName?: string
  autoUpsert?: boolean
  cascadeRelations?: boolean
  draftId?: string
  primaryKey?: string
  [key: string]: unknown
}

export interface DbPutGlobalData {
  sqliteAdapter?: any
  database?: any
  stores?: Map<string, any> | Record<string, any>
  draftStore?: any
  runtime?: any
  eventBus?: any
  cacheStorage?: { invalidateByTable: (table: string) => void; [key: string]: any }
  onTableMutated?: (table: string) => void
  [key: string]: unknown
}

export interface DbPutResult {
  success: boolean
  record: any
  error?: string | null
  tableName: string
  id?: string | number
}

export class DbPutNodeEngine extends BaseNode<any, any, DbPutNodeData, DbPutGlobalData> {
  private isExecuting = false

  constructor(
    options: Partial<NodeInitOptions<any, any, DbPutNodeData, DbPutGlobalData>> = {},
    globalData?: DbPutGlobalData,
  ) {
    const initialData: DbPutNodeData = {
      tableName: options.initialData?.tableName ?? 'characters',
      structName: options.initialData?.structName ?? 'Character',
      autoUpsert: options.initialData?.autoUpsert ?? true,
      cascadeRelations: options.initialData?.cascadeRelations ?? false,
      primaryKey: options.initialData?.primaryKey ?? 'id',
      ...options.initialData,
    }

    super(
      {
        nodeType: NODE_TYPES.DB_PUT,
        inputs: options.inputs ?? {
          trigger: Boolean,
          in: null,
          targetTable: String,
          record: null,
          id: null,
          draftId: String,
        },
        outputs: options.outputs ?? {
          status: String,
          progress: Number,
          result: null,
          error: null,
          onSuccess: Boolean,
          onError: Boolean,
          onProgress: Boolean,
          finally: Boolean,
        },
        initialData,
        onInit: (ctx) => {
          ctx.node.emitOutput('status', 'idle')
          ctx.node.emitOutput('progress', 0)
          ctx.node.emitOutput('result', null)
          ctx.node.emitOutput('error', null)
          ctx.node.emitOutput('onSuccess', false)
          ctx.node.emitOutput('onError', false)
          ctx.node.emitOutput('onProgress', false)
          ctx.node.emitOutput('finally', false)
          if (options.onInit) options.onInit(ctx)
        },
        onDestroy: options.onDestroy,
        onInputChange: (name, value, ctx) => {
          if ((name === 'trigger' || name === 'in') && Boolean(value)) {
            void (ctx.node as DbPutNodeEngine).executePut(ctx)
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

  public async executePut(ctx?: any): Promise<DbPutResult> {
    if (this.isExecuting) {
      return {
        success: false,
        record: null,
        error: 'Execution already in progress',
        tableName: this.data.tableName || 'characters',
      }
    }

    this.isExecuting = true
    this.setStatus('running', 0)
    const inputs = ctx?.inputs ?? this.getInputs()
    const targetTable = inputs.targetTable || this.data.tableName || 'characters'
    const structName = this.data.structName || 'Character'
    const pkField = this.data.primaryKey || 'id'
    const draftId = inputs.draftId || this.data.draftId

    // 1. Initial State Broadcast (Start / 0%)
    this.emitOutput('status', 'saving')
    this.emitOutput('progress', 0)
    this.emitOutput('error', null)
    this.emitOutput('onProgress', true)

    this.dispatchLifecycleEvent('start', { targetTable, progress: 0 })

    try {
      // Extract record payload
      let rawRecord = inputs.record
      if (!rawRecord || typeof rawRecord !== 'object') {
        const payload: Record<string, any> = {}
        for (const [k, v] of Object.entries(inputs)) {
          if (
            k !== 'trigger' &&
            k !== 'in' &&
            k !== 'targetTable' &&
            k !== 'draftId' &&
            v !== undefined
          ) {
            payload[k] = v
          }
        }
        rawRecord = payload
      }

      // Clone to avoid mutating original source object
      const recordToSave: Record<string, any> = { ...rawRecord }

      // Resolve primary key
      if (inputs.id !== undefined && inputs.id !== null) {
        recordToSave[pkField] = inputs.id
      } else if (recordToSave[pkField] === undefined || recordToSave[pkField] === null) {
        if (recordToSave.characterId !== undefined) {
          recordToSave[pkField] = recordToSave.characterId
        } else {
          recordToSave[pkField] = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        }
      }

      const entityId = String(recordToSave[pkField])

      // Emitting 50% progress during persistence execution
      this.emitOutput('progress', 50)
      this.emitOutput('onProgress', true)
      this.setStatus('running', 50)
      this.dispatchLifecycleEvent('progress', { targetTable, entityId, progress: 50 })

      // 2. Perform DB / Store Upsert
      const runtime = this.globalData?.runtime
      const stores = this.globalData?.stores
      const sqliteAdapter = this.globalData?.sqliteAdapter || runtime?.sqliteAdapter

      let savedRecord: any = recordToSave

      if (sqliteAdapter) {
        sqliteAdapter.saveEntity(entityId, structName, 1, recordToSave)
        savedRecord = { id: entityId, ...recordToSave }
      } else if (runtime && typeof runtime.getStore === 'function') {
        const store = runtime.getStore(targetTable) || runtime.getStore(structName)
        if (store) {
          if (typeof store.upsert === 'function') {
            savedRecord = store.upsert(recordToSave) ?? recordToSave
          } else if (typeof store.put === 'function') {
            savedRecord = store.put(recordToSave) ?? recordToSave
          } else if (typeof store.set === 'function') {
            store.set(entityId, recordToSave)
            savedRecord = recordToSave
          } else if (typeof store.save === 'function') {
            savedRecord = store.save(recordToSave) ?? recordToSave
          }
        }
      } else if (stores instanceof Map) {
        const store = stores.get(targetTable) || stores.get(structName)
        if (store && typeof store.set === 'function') {
          store.set(entityId, recordToSave)
        }
      } else if (stores && typeof stores === 'object') {
        const store = (stores as any)[targetTable] || (stores as any)[structName]
        if (store && typeof store.set === 'function') {
          store.set(entityId, recordToSave)
        } else if (Array.isArray(store)) {
          const idx = store.findIndex((r: any) => String(r[pkField]) === entityId)
          if (idx >= 0) {
            store[idx] = { ...store[idx], ...recordToSave }
          } else {
            store.push(recordToSave)
          }
        }
      }

      // Handle cascade relations if configured
      if (this.data.cascadeRelations) {
        this.handleCascadeRelations(recordToSave, entityId)
      }

      // Commit draft if draftStore is present and draftId is specified
      if (draftId) {
        const draftStore = this.globalData?.draftStore || runtime?.draftStore
        if (draftStore && typeof draftStore.commitDraft === 'function') {
          draftStore.commitDraft(draftId)
        }
      }

      // 3. Success Broadcast (100%)
      this.setStatus('resolved', 100)
      this.emitOutput('status', 'success')
      this.emitOutput('progress', 100)
      this.emitOutput('result', savedRecord)
      this.emitOutput('error', null)
      this.emitOutput('onSuccess', true)
      this.emitOutput('finally', true)

      this.dispatchLifecycleEvent('success', {
        targetTable,
        entityId,
        record: savedRecord,
        progress: 100,
      })

      const cacheStorage =
        this.globalData?.cacheStorage || (this.globalData?.runtime as any)?.cacheStorage
      if (cacheStorage && typeof cacheStorage.invalidateByTable === 'function') {
        cacheStorage.invalidateByTable(targetTable)
      }

      if (typeof this.globalData?.onTableMutated === 'function') {
        this.globalData.onTableMutated(targetTable)
      }

      // Reset pulses
      setTimeout(() => {
        this.emitOutput('onSuccess', false)
        this.emitOutput('onProgress', false)
        this.emitOutput('finally', false)
      }, 50)

      this.isExecuting = false
      return {
        success: true,
        record: savedRecord,
        tableName: targetTable,
        id: entityId,
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err)
      this.setStatus('rejected', 0, err)
      this.emitOutput('status', 'error')
      this.emitOutput('error', errMsg)
      this.emitOutput('result', null)
      this.emitOutput('onError', true)
      this.emitOutput('finally', true)

      this.dispatchLifecycleEvent('error', { targetTable, error: errMsg })

      setTimeout(() => {
        this.emitOutput('onError', false)
        this.emitOutput('onProgress', false)
        this.emitOutput('finally', false)
      }, 50)

      this.isExecuting = false
      return {
        success: false,
        record: null,
        error: errMsg,
        tableName: targetTable,
      }
    }
  }

  private handleCascadeRelations(parentRecord: Record<string, any>, parentId: string): void {
    const sqliteAdapter = this.globalData?.sqliteAdapter || this.globalData?.runtime?.sqliteAdapter
    if (!sqliteAdapter) return

    for (const [key, val] of Object.entries(parentRecord)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const relationTableName = key
        for (let i = 0; i < val.length; i++) {
          const child = val[i]
          const childId = child.id || `${parentId}_${key}_${i}`
          const childData = { ...child, parent_id: parentId }
          try {
            sqliteAdapter.saveEntity(String(childId), relationTableName, 1, childData)
          } catch {
            // Best effort cascade write
          }
        }
      }
    }
  }

  private dispatchLifecycleEvent(
    phase: 'start' | 'progress' | 'success' | 'error',
    payload: any,
  ): void {
    const eventBus = this.globalData?.eventBus || this.globalData?.runtime?.eventBus
    if (eventBus && typeof eventBus.emit === 'function') {
      eventBus.emit(`mutation:${payload.targetTable || 'record'}:${phase}`, payload)
      eventBus.emit('mutation:lifecycle', { phase, ...payload })
      if (phase === 'success') {
        eventBus.emit('table:mutated', {
          tableName: payload.targetTable,
          entityId: payload.entityId,
          record: payload.record,
        })
      }
    }
  }
}

export function createDbPutNode(
  options: Partial<NodeInitOptions<any, any, DbPutNodeData, DbPutGlobalData>> = {},
  globalData?: DbPutGlobalData,
) {
  return new DbPutNodeEngine(options, globalData)
}
