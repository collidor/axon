import { Injector } from '@collidor/toolkit'
import type { BaseNode } from './base.node'

export type NodeDefinition = {
  type: string
  // oxlint-disable-next-line typescript/no-explicit-any
  component?: any
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine: (options?: any, globalData?: any) => BaseNode
}

export class AxonNodeRegistry {
  #injector = new Injector()
  #types = new Set<string>()

  register(type: string, definition: NodeDefinition) {
    this.#injector.register(type, definition)
    this.#types.add(type)
  }

  safeGet(type: string): NodeDefinition | null {
    const direct = this.#injector.safeGet(type)
    if (direct) return direct
    if (!type.endsWith('-node')) {
      const withSuffix = this.#injector.safeGet(`${type}-node`)
      if (withSuffix) return withSuffix
    } else {
      const withoutSuffix = this.#injector.safeGet(type.replace(/-node$/, ''))
      if (withoutSuffix) return withoutSuffix
    }
    return null
  }

  get(type: string): NodeDefinition | null {
    return this.safeGet(type)
  }

  has(type: string): boolean {
    return this.safeGet(type) !== null
  }

  get types() {
    return Array.from(this.#types)
  }

  clear() {
    this.#types.clear()
  }
}

export const nodeRegistry = new AxonNodeRegistry()
