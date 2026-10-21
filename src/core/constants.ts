export const types = ['number', 'string', 'boolean', 'object', 'array', 'any'] as const
export type PortDataType = (typeof types)[number]

export const typeMap: Record<string, unknown> = {
  number: Number,
  string: String,
  boolean: Boolean,
  array: Array,
  object: Object,
}

export const reverseTypeMap = Object.entries(typeMap).reduce((acc, [key, value]) => {
  acc.set(value, 'any')
  if (types.includes(key as PortDataType)) {
    acc.set(value, key as PortDataType)
  }
  return acc
}, new Map<unknown, PortDataType>())

export function getTypeFromConstructor(constructor: unknown): PortDataType {
  const type = reverseTypeMap.get(constructor)
  return type || 'any'
}

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Extracts the base nodeId from a port identifier (e.g. "node_1:output" -> "node_1").
 */
export function getNodeIdFromPort(endpoint: string): string {
  const idx = endpoint.indexOf(':')
  return idx !== -1 ? endpoint.slice(0, idx) : endpoint
}
