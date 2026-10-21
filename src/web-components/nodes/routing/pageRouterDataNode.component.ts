import { AxonBaseNodeElement } from '../baseNodeElement.js'
import {
  type PageRouterDataNodeEngine,
  createPageRouterDataNode,
} from '../../../nodes/data/dataGraph.engine.js'
import { NODE_TYPES } from '../../../nodes/nodes.constants.js'

/**
 * Custom element representing a composite Page Router & URL node.
 * Provides outputs for router struct fields, route path params, dynamic query params,
 * and route globals (queryParams, params, url).
 */
export class AxonPageRouterDataNode extends AxonBaseNodeElement<PageRouterDataNodeEngine> {
  createEngine(options?: { id?: string; initialData?: any }): PageRouterDataNodeEngine {
    return createPageRouterDataNode(options)
  }

  connectedCallback(): void {
    this.axonNodeType = NODE_TYPES.PAGE_ROUTER_DATA
    this.setAttribute('data-node-type', NODE_TYPES.PAGE_ROUTER_DATA)
    this.classList.add('axon-page-router-data-node')
    super.connectedCallback()
  }

  /**
   * Renders router struct outputs, url parameters, query parameters, and interactive add/remove controls.
   */
  render(): void {
    const nodeState = this.nodeData || (this.engine as any)?.data || {}
    const nodeTitle: string = nodeState.title || 'Page Router & URL'
    const structFields: Array<{ name: string; type: string }> = Array.isArray(nodeState.structFields)
      ? nodeState.structFields
      : []
    const urlParams: string[] = Array.isArray(nodeState.urlParams) ? nodeState.urlParams : []
    const queryParams: Array<any> = Array.isArray(nodeState.queryParams) ? nodeState.queryParams : []

    const structPortsMarkup = structFields
      .map((field) => {
        const typeLabel =
          field.type === 'array' || field.type === 'list'
            ? 'Array&lt;Struct&gt;'
            : field.type === 'struct'
              ? 'struct'
              : field.type || 'struct'
        const tagClass = field.type === 'list' ? 'array' : field.type || 'struct'
        return `
        <axon-port-out id="${this.id || 'router'}:${field.name}" port-name="${field.name}" data-type="${field.type || 'struct'}" class="port output">
          <span class="port-label">${field.name} <span class="port-type-tag ${tagClass}">(${typeLabel})</span></span>
        </axon-port-out>
      `
      })
      .join('')

    const urlPortsMarkup = urlParams
      .map(
        (parameterName) => `
        <axon-port-out id="${this.id || 'router'}:${parameterName}" port-name="${parameterName}" data-type="string" class="port output">
          <span class="port-label">:${parameterName} <span class="port-type-tag primitive">(param)</span></span>
        </axon-port-out>
      `,
      )
      .join('')

    const queryPortsMarkup = queryParams
      .map((queryItem) => {
        const queryName = typeof queryItem === 'string' ? queryItem : queryItem?.name
        if (!queryName) return ''
        const isNumeric =
          ['page', 'pageSize', 'limit', 'offset'].includes(queryName) ||
          (typeof queryItem !== 'string' && queryItem?.type === 'number')
        const typeLabel = isNumeric ? 'number' : 'string'
        return `
        <div class="query-port-row">
          <axon-port-out id="${this.id || 'router'}:${queryName}" port-name="${queryName}" data-type="${typeLabel}" class="port output">
            <span class="port-label">?${queryName} <span class="port-type-tag ${isNumeric ? 'number' : 'primitive'}">(${typeLabel})</span></span>
          </axon-port-out>
          <button type="button" class="query-param-del-btn" data-param-name="${queryName}" title="Remove query param">✕</button>
        </div>
      `
      })
      .join('')

    this.innerHTML = `
      <div class="data-node-card page-router-card">
        <div class="data-node-header page-router-header">
          <span class="node-icon">🧭</span>
          <div class="node-title-group">
            <span class="node-badge">Page Router Data</span>
            <strong class="node-title">${nodeTitle}</strong>
          </div>
        </div>
        <div class="data-node-body">
          <div class="ports-category-tag">📦 Router Struct Output</div>
          ${structPortsMarkup || '<div class="ports-empty-hint">No struct fields</div>'}
          <div class="ports-category-tag">🔗 URL & Route Params</div>
          ${urlPortsMarkup}
          <div class="ports-category-tag">🔍 Query Parameters</div>
          ${queryPortsMarkup || '<div class="ports-empty-hint">No query params defined</div>'}
          <div class="query-param-add-row">
            <input type="text" class="query-param-input" placeholder="+ param (e.g. page)" />
            <button type="button" class="query-param-add-btn" title="Add Query Param">+</button>
          </div>
          <div class="ports-category-tag">🌐 Route Globals</div>
          <axon-port-out id="${this.id || 'router'}:queryParams" port-name="queryParams" data-type="struct" class="port output">
            <span class="port-label">queryParams <span class="port-type-tag struct">({})</span></span>
          </axon-port-out>
          <axon-port-out id="${this.id || 'router'}:params" port-name="params" data-type="struct" class="port output">
            <span class="port-label">params <span class="port-type-tag struct">({})</span></span>
          </axon-port-out>
          <axon-port-out id="${this.id || 'router'}:url" port-name="url" data-type="string" class="port output">
            <span class="port-label">url <span class="port-type-tag primitive">(path)</span></span>
          </axon-port-out>
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    const stopPropagation = (event: Event) => event.stopPropagation()

    const addQueryInputElement = this.querySelector<HTMLInputElement>('.query-param-input')
    const addQueryButtonElement = this.querySelector<HTMLButtonElement>('.query-param-add-btn')

    const handleAddQueryParameter = () => {
      if (!addQueryInputElement) return
      let queryParamName = addQueryInputElement.value.trim()
      if (queryParamName.startsWith('?')) queryParamName = queryParamName.slice(1).trim()
      if (!queryParamName) return

      const currentData = this.nodeData || (this.engine as any)?.data || {}
      const currentList: Array<any> = Array.isArray(currentData.queryParams)
        ? [...currentData.queryParams]
        : []

      const alreadyExists = currentList.some(
        (item) => (typeof item === 'string' ? item : item?.name) === queryParamName,
      )
      if (!alreadyExists) {
        currentList.push({ name: queryParamName, defaultValue: '' })
        const patch = { queryParams: currentList }
        this.nodeData = { ...currentData, ...patch }
        if (this.engine) {
          ;(this.engine as any).data = { ...(this.engine as any).data, ...patch }
          if ((this.engine as any).outputs) {
            const isNumeric = ['page', 'pageSize', 'limit', 'offset'].includes(queryParamName)
            ;(this.engine as any).outputs[queryParamName] = isNumeric ? Number : String
            ;(this.engine as any).outputs[`query:${queryParamName}`] = isNumeric ? Number : String
          }
        }
        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            bubbles: true,
            composed: true,
            detail: { id: this.id, data: patch },
          }),
        )
        this.render()
      } else {
        addQueryInputElement.value = ''
      }
    }

    if (addQueryInputElement) {
      addQueryInputElement.addEventListener('pointerdown', stopPropagation)
      addQueryInputElement.addEventListener('mousedown', stopPropagation)
      addQueryInputElement.addEventListener('click', stopPropagation)
      addQueryInputElement.addEventListener('keydown', (event: KeyboardEvent) => {
        stopPropagation(event)
        if (event.key === 'Enter') {
          event.preventDefault()
          handleAddQueryParameter()
        }
      })
    }

    if (addQueryButtonElement) {
      addQueryButtonElement.addEventListener('pointerdown', stopPropagation)
      addQueryButtonElement.addEventListener('mousedown', stopPropagation)
      addQueryButtonElement.addEventListener('click', (event) => {
        stopPropagation(event)
        handleAddQueryParameter()
      })
    }

    const deleteButtons = this.querySelectorAll<HTMLButtonElement>('.query-param-del-btn')
    deleteButtons.forEach((deleteButton) => {
      deleteButton.addEventListener('pointerdown', stopPropagation)
      deleteButton.addEventListener('mousedown', stopPropagation)
      deleteButton.addEventListener('click', (event) => {
        stopPropagation(event)
        const parameterNameToRemove = deleteButton.getAttribute('data-param-name')
        if (!parameterNameToRemove) return

        const currentData = this.nodeData || (this.engine as any)?.data || {}
        const currentList: Array<any> = Array.isArray(currentData.queryParams)
          ? [...currentData.queryParams]
          : []
        const updatedList = currentList.filter(
          (item) => (typeof item === 'string' ? item : item?.name) !== parameterNameToRemove,
        )

        const patch = { queryParams: updatedList }
        this.nodeData = { ...currentData, ...patch }
        if (this.engine) {
          ;(this.engine as any).data = { ...(this.engine as any).data, ...patch }
        }
        this.dispatchEvent(
          new CustomEvent('node-data-change', {
            bubbles: true,
            composed: true,
            detail: { id: this.id, data: patch },
          }),
        )
        this.render()
      })
    })
  }
}
