export const isValid = (value: unknown, target: unknown): boolean => {
  // 1. Target is null -> Wildcard / Any type allowed
  if (target === null) return true

  // 2. Handle Null/Undefined value (Strict: types are not nullable by default)
  if (value == null) return false

  // 3. Performance optimization: Direct constructor check
  if (value.constructor === target) return true

  // 4. Handle Primitives (Number, String, Boolean)
  if (target === Number) return typeof value === 'number'
  if (target === String) return typeof value === 'string'
  if (target === Boolean) return typeof value === 'boolean'

  // 5. Handle Arrays
  if (target === Array) return Array.isArray(value)

  // 6. Handle Custom Classes & Built-in Objects
  if (typeof target === 'function') {
    try {
      return value instanceof (target as unknown as new (...args: unknown[]) => object)
    } catch {
      return false
    }
  }

  return false
}
