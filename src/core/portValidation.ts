// oxlint-disable typescript/no-explicit-any
import { isAssignable } from '@collidor/struct'
import type { TypeDescriptor } from '@collidor/struct'

/**
 * Normalizes an Axon port type definition (JavaScript constructor, null wildcard,
 * AST TypeDescriptor, or @collidor/struct BaseSchema) into an AST TypeDescriptor.
 */
export function toPortDescriptor(type: unknown): TypeDescriptor {
  if (type === null || type === undefined) {
    return { kind: 'any' }
  }

  // 1. @collidor/struct Schema instance carrying a descriptor
  if (typeof type === 'object' && type !== null && 'descriptor' in type) {
    return (type as any).descriptor as TypeDescriptor
  }

  // 2. Direct AST TypeDescriptor object
  if (typeof type === 'object' && type !== null && 'kind' in type && typeof (type as any).kind === 'string') {
    return type as TypeDescriptor
  }

  // 3. Standard JavaScript primitive constructors
  if (type === Number) return { kind: 'number' }
  if (type === String) return { kind: 'string' }
  if (type === Boolean) return { kind: 'boolean' }
  if (type === BigInt) return { kind: 'bigint' }
  if (type === Date) return { kind: 'date' }
  if (type === Array) return { kind: 'array', items: { kind: 'any' } }

  // 4. Custom class constructor
  if (typeof type === 'function') {
    const fnName = type.name || 'Object'
    return { kind: 'any', description: fnName }
  }

  return { kind: 'any' }
}

/**
 * Checks whether data from an output port (sourceType) is assignable to an input port (targetType).
 */
export function isPortAssignable(sourceType: unknown, targetType: unknown): boolean {
  if (sourceType === null || sourceType === undefined) return true
  if (targetType === null || targetType === undefined) return true

  const sourceDesc = toPortDescriptor(sourceType)
  const targetDesc = toPortDescriptor(targetType)

  return isAssignable(sourceDesc, targetDesc)
}

export interface PortConnectionValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Validates whether two ports can be connected, returning diagnostic details.
 */
export function validatePortConnection(
  sourceType: unknown,
  targetType: unknown,
): PortConnectionValidationResult {
  const valid = isPortAssignable(sourceType, targetType)
  if (valid) {
    return { valid: true }
  }

  const sDesc = toPortDescriptor(sourceType)
  const tDesc = toPortDescriptor(targetType)

  const sName = sDesc.name ? `struct "${sDesc.name}"` : sDesc.kind
  const tName = tDesc.name ? `struct "${tDesc.name}"` : tDesc.kind

  return {
    valid: false,
    reason: `Incompatible port types: output of type ${sName} cannot connect to input of type ${tName}`,
  }
}
