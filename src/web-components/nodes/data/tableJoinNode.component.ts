// oxlint-disable typescript/no-explicit-any
import { AxonBaseNodeElement } from '../baseNodeElement'
import {
  createTableJoinNode,
  TableJoinNodeEngine,
} from '../../../nodes/data/dataGraph.engine'
import { NODE_TYPES } from '../../../nodes/nodes.constants'
import { TAG_NAMES } from '../../constants'

/**
 * Visual Web Component representing a Database Table Join Node.
 * Enriches a source stream of records by joining related tables via foreign key relationships.
 */
export class AxonTableJoinNode extends AxonBaseNodeElement<TableJoinNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): TableJoinNodeEngine {
    return createTableJoinNode(options)
  }

  connectedCallback() {
    this.axonNodeType = NODE_TYPES.TABLE_JOIN
    this.setAttribute('data-node-type', NODE_TYPES.TABLE_JOIN)
    this.classList.add('axon-table-join-node')
    super.connectedCallback()
  }

  render() {
    const nodeConfiguration = this.nodeData || (this.engine as any)?.data || {}
    const joinTable = nodeConfiguration.joinTable || 'attributes'
    const sourceField = nodeConfiguration.sourceField || 'attribute_id'
    const targetField = nodeConfiguration.targetField || 'id'
    const asProperty =
      nodeConfiguration.asProperty && nodeConfiguration.asProperty !== 'attributes'
        ? nodeConfiguration.asProperty
        : joinTable !== 'attributes' && !nodeConfiguration.relationshipId
          ? joinTable
          : nodeConfiguration.asProperty || joinTable
    const sourceTable = nodeConfiguration.sourceTable || ''
    const currentRelationshipId = nodeConfiguration.relationshipId || ''
    const availableTables: string[] = nodeConfiguration.availableTables || []
    const availableRelations: any[] = nodeConfiguration.availableRelations || []

    const onClause = `${sourceTable ? sourceTable + '.' : ''}${sourceField} = ${joinTable}.${targetField}`

    // Incremental DOM update: preserve port elements and update select value and title
    const existingCard = this.querySelector('.table-join-card')
    if (existingCard) {
      const titleElement = existingCard.querySelector('.node-title')
      if (titleElement) {
        titleElement.textContent = joinTable || this.id
        titleElement.setAttribute('title', `${joinTable} ON ${onClause}`)
      }
      return
    }

    let optionsHtml = ''
    if (availableRelations.length > 0) {
      const relationOptions = availableRelations
        .map((rel: any) => {
          const isSelected = currentRelationshipId === rel.id
          const targetTable = rel.targetTableId || rel.targetTable
          return `<option value="rel:${rel.id}" ${isSelected ? 'selected' : ''}>🔗 ${rel.name || rel.id} → ${targetTable}</option>`
        })
        .join('')
      optionsHtml += `<optgroup label="Relationships">${relationOptions}</optgroup>`
    }

    const tables = availableTables.length > 0 ? availableTables : joinTable ? [joinTable] : []

    const tableOptions = tables
      .map((tbl) => {
        const isSelected = !currentRelationshipId && joinTable === tbl
        return `<option value="table:${tbl}" ${isSelected ? 'selected' : ''}>🗄️ ${tbl}</option>`
      })
      .join('')
    optionsHtml += `<optgroup label="Tables">${tableOptions}</optgroup>`

    this.innerHTML = `
      <div class="data-node-card table-join-card">
        <div class="data-node-header table-join-header">
          <span class="card-type-label">Table Join</span>
          <span class="card-id-label node-title" title="${joinTable} ON ${onClause}">${joinTable || this.id}</span>
        </div>
        <div class="data-node-body">
          <div class="node-control-row">
            <label class="node-control-label">Join:</label>
            <ui-select class="node-inline-select axon-join-select" size="sm" title="Choose relationship or table to join">
              ${optionsHtml}
            </ui-select>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'join'}:sourceRecords"
              port-name="sourceRecords"
              data-type="array"
              class="port input"
            >
              <span class="port-label">Source Records ([])</span>
            </axon-port-in>
            <axon-port-out
              id="${this.id || 'join'}:records"
              port-name="records"
              data-type="array"
              class="port output"
            >
              <span class="port-label">Records (+.${asProperty})</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'join'}:sourceFirst"
              port-name="sourceFirst"
              data-type="object"
              class="port input"
            >
              <span class="port-label">Source First ({})</span>
            </axon-port-in>
            <axon-port-out
              id="${this.id || 'join'}:first"
              port-name="first"
              data-type="object"
              class="port output"
            >
              <span class="port-label">First (+.${asProperty})</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <axon-port-in
              id="${this.id || 'join'}:joinValue"
              port-name="joinValue"
              data-type="string"
              class="port input"
            >
              <span class="port-label">Join Key Override</span>
            </axon-port-in>
            <axon-port-out
              id="${this.id || 'join'}:count"
              port-name="count"
              data-type="number"
              class="port output"
            >
              <span class="port-label">Count (#)</span>
            </axon-port-out>
          </div>
          <div class="data-node-row port-row-pair">
            <span></span>
            <axon-port-out
              id="${this.id || 'join'}:sql"
              port-name="sql"
              data-type="string"
              class="port output"
            >
              <span class="port-label">SQL Query</span>
            </axon-port-out>
          </div>
        </div>
      </div>
    `

    const selectElement = this.querySelector('.axon-join-select') as any
    if (selectElement) {
      const stopPropagationHandler = (pointerEvent: Event) => pointerEvent.stopPropagation()
      selectElement.addEventListener('pointerdown', stopPropagationHandler)
      selectElement.addEventListener('mousedown', stopPropagationHandler)
      selectElement.addEventListener('click', stopPropagationHandler)

      const onJoinChange = (changeEvent: Event) => {
        changeEvent.stopPropagation()
        const selectedValue = (changeEvent as CustomEvent).detail?.value ?? selectElement.value
        let patchData: Record<string, any> = {}

        if (selectedValue.startsWith('rel:')) {
          const relationIdentifier = selectedValue.slice(4)
          const matchedRelation = availableRelations.find((r: any) => r.id === relationIdentifier)
          if (matchedRelation) {
            const targetName = matchedRelation.targetTableId || matchedRelation.targetTable
            const sourceName = matchedRelation.sourceTableId || matchedRelation.sourceTable || sourceTable
            patchData = {
              relationshipId: matchedRelation.id,
              joinTable: targetName,
              sourceTable: sourceName,
              sourceField: matchedRelation.sourceColumn || 'id',
              targetField: matchedRelation.targetColumn || 'id',
              asProperty: targetName,
              cardinality: matchedRelation.cardinality || 'one-to-one',
            }
          }
        } else if (selectedValue.startsWith('table:')) {
          const targetTable = selectedValue.slice(6)
          patchData = {
            relationshipId: '',
            joinTable: targetTable,
            sourceTable: sourceTable,
            sourceField:
              targetTable === 'attributes' ? 'attribute_id' : `${targetTable.replace(/s$/, '')}_id`,
            targetField: 'id',
            asProperty: targetTable,
            cardinality: 'one-to-one',
          }
        }

        this.nodeData = { ...this.nodeData, ...patchData }
        if (this.engine) {
          ;(this.engine as any).data = { ...(this.engine as any).data, ...patchData }
        }

        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            bubbles: true,
            composed: true,
            detail: {
              id: this.id,
              data: patchData,
            },
          }),
        )

        this.render()
      }

      selectElement.addEventListener('change', onJoinChange)
      selectElement.addEventListener('ui-select-change', onJoinChange)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_TABLE_JOIN_NODE)) {
  customElements.define(TAG_NAMES.AXON_TABLE_JOIN_NODE, AxonTableJoinNode)
}
