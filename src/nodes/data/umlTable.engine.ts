import { BaseNode, type NodeInitOptions } from '../../core/base.node'
import { NODE_TYPES } from '../nodes.constants'

export type UmlColumnType =
  | 'string'
  | 'text'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'json'
  | 'enum'
  | 'struct'
  | 'array'

export type UmlFieldVisibility = 'PUBLIC' | 'GM_ONLY' | 'SECRET'

export interface UmlColumnData {
  id?: string
  name: string
  type: UmlColumnType
  isPrimary?: boolean
  isForeignKey?: boolean
  foreignKeyTable?: string
  foreignKeyColumn?: string
  isNullable?: boolean
  isUnique?: boolean
  defaultValue?: unknown
  visibility?: UmlFieldVisibility
  description?: string
  enumValues?: string[]
}

export interface UmlTableNodeData {
  tableName: string
  displayName?: string
  description?: string
  storageClass?: 'sqlite_table' | 'entity_graph' | 'in_memory'
  columns: UmlColumnData[]
  [key: string]: unknown
}

export class UmlTableNodeEngine extends BaseNode<any, any, UmlTableNodeData> {
  constructor(options: Partial<NodeInitOptions<any, any, UmlTableNodeData>> = {}) {
    const initialData: UmlTableNodeData = {
      tableName: options.initialData?.tableName || 'table_entity',
      displayName: options.initialData?.displayName || 'Entity',
      storageClass: options.initialData?.storageClass || 'sqlite_table',
      columns: options.initialData?.columns || [
        { name: 'id', type: 'string', isPrimary: true, isNullable: false },
        { name: 'name', type: 'string', isNullable: false },
        { name: 'created_at', type: 'datetime', isNullable: false },
      ],
      ...options.initialData,
    }

    const inputs: Record<string, any> = {}
    const outputs: Record<string, any> = {}

    for (const col of initialData.columns) {
      inputs[col.name] = null
      outputs[col.name] = null
    }

    super({
      nodeType: NODE_TYPES.UML_TABLE,
      inputs: options.inputs ?? inputs,
      outputs: options.outputs ?? outputs,
      initialData,
      ...options,
    })
  }

  public addColumn(col: UmlColumnData) {
    if (!this.data.columns) this.data.columns = []
    this.data.columns.push(col)
    ;(this.inputDefinition as any)[col.name] = null
    ;(this.outputDefinition as any)[col.name] = null
  }

  public removeColumn(colName: string) {
    if (!this.data.columns) return
    this.data.columns = this.data.columns.filter((c) => c.name !== colName)
    delete (this.inputDefinition as any)[colName]
    delete (this.outputDefinition as any)[colName]
  }
}

export function createUmlTableNode(
  options: Partial<NodeInitOptions<any, any, UmlTableNodeData>> = {},
) {
  return new UmlTableNodeEngine(options)
}
