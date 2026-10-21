import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'
import { s } from '@collidor/struct'

export type SqliteOperation = 'GET_BY_ID' | 'QUERY_ALL' | 'FILTER'

export interface SqliteTableNodeData {
  tableName?: string
  structName?: string
  operation?: SqliteOperation
  keyField?: string
  [key: string]: unknown
}

export const sqliteTableDataSchema = s.struct({
  tableName: s.string().default(''),
  structName: s.string().default(''),
  operation: s.enum(['GET_BY_ID', 'QUERY_ALL', 'FILTER']).default('GET_BY_ID'),
  keyField: s.string().default('id'),
})

export interface SqliteTableGlobalData {
  sqliteAdapter?: any
  database?: any
  stores?: Map<string, any> | Record<string, any>
  runtime?: any
  [key: string]: unknown
}

export class SqliteTableNodeEngine extends BaseNode<
  any,
  any,
  SqliteTableNodeData,
  SqliteTableGlobalData
> {
  constructor(
    options: Partial<NodeInitOptions<any, any, SqliteTableNodeData, SqliteTableGlobalData>> = {},
    globalData?: SqliteTableGlobalData,
  ) {
    const initialData: SqliteTableNodeData = {
      tableName: options.initialData?.tableName ?? '',
      structName: options.initialData?.structName ?? '',
      operation: options.initialData?.operation ?? 'GET_BY_ID',
      keyField: options.initialData?.keyField ?? 'id',
      ...options.initialData,
    }

    super(
      {
        nodeType: NODE_TYPES.SQLITE_TABLE,
        inputs: options.inputs ?? {
          trigger: Boolean,
          id: null,
          characterId: null,
          filter: null,
          page: Number,
          pageSize: Number,
          limit: Number,
          offset: Number,
          data: null,
        },
        outputs: options.outputs ?? {
          record: null,
          rows: Array,
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
          onSuccess: Boolean,
        },
        initialData,
        dataSchema: options.dataSchema ?? sqliteTableDataSchema,
        onInit: options.onInit,
        onDestroy: options.onDestroy,
        onInputChange: (name, value, ctx) => {
          if (name === 'trigger' && Boolean(value)) {
            ;(ctx.node as SqliteTableNodeEngine).executeQuery(ctx)
          } else if (name === 'id' || name === 'characterId' || name === 'filter') {
            ;(ctx.node as SqliteTableNodeEngine).executeQuery(ctx)
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

  public executeQuery(ctx?: any): any {
    const inputs = ctx?.inputs ?? this.getInputs()
    const targetTable = this.data.tableName || 'characters'
    const op = this.data.operation || 'GET_BY_ID'
    const targetId = inputs.id !== undefined && inputs.id !== null ? inputs.id : inputs.characterId

    this.emitOutput('loading', true)
    this.emitOutput('error', null)

    try {
      let record: any = null
      let rows: any[] = []
      let count = 0

      const runtime = this.globalData?.runtime
      const stores = this.globalData?.stores
      const sqliteAdapter = this.globalData?.sqliteAdapter || runtime?.sqliteAdapter

      let resolvedStore: any = null
      if (runtime && typeof runtime.getStore === 'function') {
        resolvedStore =
          runtime.getStore(targetTable) || runtime.getStore(this.data.structName || targetTable)
      } else if (stores instanceof Map) {
        resolvedStore = stores.get(targetTable) || stores.get(this.data.structName || targetTable)
      } else if (stores && typeof stores === 'object') {
        resolvedStore =
          (stores as any)[targetTable] || (stores as any)[this.data.structName || targetTable]
      }

      if (resolvedStore) {
        if (op === 'GET_BY_ID') {
          if (targetId !== undefined && targetId !== null) {
            record =
              resolvedStore.getById(targetId) ||
              resolvedStore.getById(String(targetId)) ||
              resolvedStore.getById(Number(targetId))
            if (!record && typeof resolvedStore.getAll === 'function') {
              const all = resolvedStore.getAll()
              record = all.find(
                (r: any) =>
                  String(r.id) === String(targetId) || String(r.characterId) === String(targetId),
              )
            }
          }
          rows = record ? [record] : []
          count = record ? 1 : 0
        } else if (op === 'QUERY_ALL' || op === 'FILTER') {
          rows = resolvedStore.getAll()
          count = rows.length
          record = rows[0] || null
        }
      } else if (sqliteAdapter) {
        if (op === 'GET_BY_ID') {
          if (targetId !== undefined && targetId !== null) {
            const entity = sqliteAdapter.getEntity(String(targetId))
            record = entity ? { id: entity.id, ...entity.data } : null
          }
          rows = record ? [record] : []
          count = record ? 1 : 0
        } else {
          const db = sqliteAdapter.getDatabase()
          let dbRows = db ? db.all(targetTable) : []
          if ((!dbRows || dbRows.length === 0) && db) {
            const structName = this.data.structName || targetTable
            const structTable = `struct_${structName.toLowerCase().replace(/^struct_/, '')}`
            dbRows = db.all(structTable)
            if (!dbRows || dbRows.length === 0) {
              const entities = db.all('entities')
              if (entities && entities.length > 0) {
                const matched = entities.filter(
                  (e: any) =>
                    e.struct_id?.toLowerCase() === structName.toLowerCase() ||
                    e.struct_id?.toLowerCase() === targetTable.toLowerCase() ||
                    `${e.struct_id}s`.toLowerCase() === targetTable.toLowerCase() ||
                    `${targetTable}s`.toLowerCase() === `${e.struct_id}s`.toLowerCase(),
                )
                dbRows = matched.map((e: any) => {
                  const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data || {}
                  return { id: e.id, ...data }
                })
              }
            }
          }
          rows = dbRows || []
          count = rows.length
          record = rows[0] || null
        }
      } else {
        rows = []
        count = 0
        record = null
      }

      const page =
        inputs.page !== undefined && inputs.page !== null
          ? Math.max(1, Number(inputs.page) || 1)
          : 1
      const rawPageSize = inputs.pageSize ?? inputs.limit ?? this.data.pageSize ?? this.data.limit
      const isPaginated =
        rawPageSize !== undefined || inputs.page !== undefined || inputs.offset !== undefined
      const pageSize =
        rawPageSize !== undefined && rawPageSize !== null
          ? Math.max(1, Number(rawPageSize) || 20)
          : 20
      const offset =
        inputs.offset !== undefined && inputs.offset !== null
          ? Math.max(0, Number(inputs.offset) || 0)
          : (page - 1) * pageSize

      let totalCount = count
      let paginatedRows = rows

      if (op === 'QUERY_ALL' || op === 'FILTER') {
        totalCount = rows.length
        if (isPaginated) {
          paginatedRows = rows.slice(offset, offset + pageSize)
          record = paginatedRows[0] || null
          count = paginatedRows.length
        }
      }

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const hasNextPage = page < totalPages
      const hasPrevPage = page > 1

      this.emitOutput('record', record)
      this.emitOutput('rows', paginatedRows)
      this.emitOutput('count', count)
      this.emitOutput('total', totalCount)
      this.emitOutput('totalCount', totalCount)
      this.emitOutput('page', page)
      this.emitOutput('pageSize', pageSize)
      this.emitOutput('totalPages', totalPages)
      this.emitOutput('hasNextPage', hasNextPage)
      this.emitOutput('hasPrevPage', hasPrevPage)
      this.emitOutput('loading', false)
      this.emitOutput('onSuccess', true)

      setTimeout(() => {
        this.emitOutput('onSuccess', false)
      }, 50)

      return {
        record,
        rows: paginatedRows,
        count,
        total: totalCount,
        totalCount,
        page,
        pageSize,
        totalPages,
        hasNextPage,
        hasPrevPage,
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err)
      this.emitOutput('loading', false)
      this.emitOutput('error', errMsg)
      this.emitOutput('record', null)
      this.emitOutput('rows', [])
      this.emitOutput('count', 0)
      this.emitOutput('total', 0)
      this.emitOutput('totalCount', 0)
      this.emitOutput('page', 1)
      this.emitOutput('pageSize', 20)
      this.emitOutput('totalPages', 1)
      this.emitOutput('hasNextPage', false)
      this.emitOutput('hasPrevPage', false)
      return null
    }
  }
}
/** Convenience factory used by the node registry. Prefer constructing SqliteTableNodeEngine directly. */
export function createSqliteTableNode(
  options: Partial<NodeInitOptions<any, any, SqliteTableNodeData, SqliteTableGlobalData>> = {},
  globalData?: SqliteTableGlobalData,
) {
  return new SqliteTableNodeEngine(options, globalData)
}
