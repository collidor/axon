export function isEmptyValue(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return true
  if (Array.isArray(val) && val.length === 0) return true
  if (typeof val === 'object' && Object.keys(val).length === 0) return true
  return false
}

export function isTruthyValue(val: unknown): boolean {
  if (!val) return false
  if (isEmptyValue(val)) return false
  return true
}

export function safeToString(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') {
    return String(val)
  }
  return JSON.stringify(val) ?? ''
}

// ==========================================
// Math Operation Maps
// ==========================================
export type MathOpFn = (a: number, b: number) => number

export const MATH_OPERATIONS: Record<string, MathOpFn> = {
  ADD: (a, b) => a + b,
  '+': (a, b) => a + b,
  SUBTRACT: (a, b) => a - b,
  '-': (a, b) => a - b,
  MULTIPLY: (a, b) => a * b,
  '*': (a, b) => a * b,
  DIVIDE: (a, b) => (b !== 0 ? a / b : 0),
  '/': (a, b) => (b !== 0 ? a / b : 0),
  POWER: (a, b) => Math.pow(a, b),
  '**': (a, b) => Math.pow(a, b),
  MODULO: (a, b) => a % b,
  '%': (a, b) => a % b,
}

export const MATH_EXPR_TEMPLATES: Record<string, (a: string, b: string) => string> = {
  ADD: (a, b) => `((${a}) + (${b}))`,
  '+': (a, b) => `((${a}) + (${b}))`,
  SUBTRACT: (a, b) => `((${a}) - (${b}))`,
  '-': (a, b) => `((${a}) - (${b}))`,
  MULTIPLY: (a, b) => `((${a}) * (${b}))`,
  '*': (a, b) => `((${a}) * (${b}))`,
  DIVIDE: (a, b) => `((${b}) !== 0 ? (${a}) / (${b}) : 0)`,
  '/': (a, b) => `((${b}) !== 0 ? (${a}) / (${b}) : 0)`,
  POWER: (a, b) => `Math.pow((${a}), (${b}))`,
  '**': (a, b) => `Math.pow((${a}), (${b}))`,
  MODULO: (a, b) => `((${a}) % (${b}))`,
  '%': (a, b) => `((${a}) % (${b}))`,
}

// ==========================================
// Logic Operation Maps
// ==========================================
export type LogicOpFn = (a: boolean, b: boolean) => boolean

export const LOGIC_OPERATIONS: Record<string, LogicOpFn> = {
  AND: (a, b) => a && b,
  '&&': (a, b) => a && b,
  OR: (a, b) => a || b,
  '||': (a, b) => a || b,
  XOR: (a, b) => a !== b,
  NAND: (a, b) => !(a && b),
  NOR: (a, b) => !(a || b),
  XNOR: (a, b) => a === b,
  NOT: (a) => !a,
  '!': (a) => !a,
}

export const LOGIC_EXPR_TEMPLATES: Record<string, (a: string, b: string) => string> = {
  AND: (a, b) => `(Boolean(${a}) && Boolean(${b}))`,
  '&&': (a, b) => `(Boolean(${a}) && Boolean(${b}))`,
  OR: (a, b) => `(Boolean(${a}) || Boolean(${b}))`,
  '||': (a, b) => `(Boolean(${a}) || Boolean(${b}))`,
  XOR: (a, b) => `(Boolean(${a}) !== Boolean(${b}))`,
  NAND: (a, b) => `(!(Boolean(${a}) && Boolean(${b})))`,
  NOR: (a, b) => `(!(Boolean(${a}) || Boolean(${b})))`,
  XNOR: (a, b) => `(Boolean(${a}) === Boolean(${b}))`,
  NOT: (a) => `(!Boolean(${a}))`,
  '!': (a) => `(!Boolean(${a}))`,
}

// ==========================================
// Compare Operation Maps
// ==========================================
export type CompareOpFn = (a: unknown, b: unknown) => boolean

function isNumericValue(val: unknown): boolean {
  return typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)))
}

function compareNumbersOrValues(
  a: unknown,
  b: unknown,
  compareNumbers: (numA: number, numB: number) => boolean,
  compareValues: (valA: unknown, valB: unknown) => boolean,
): boolean {
  if (isNumericValue(a) && isNumericValue(b)) {
    return compareNumbers(Number(a), Number(b))
  }
  return compareValues(a, b)
}

export const COMPARE_OPERATIONS: Record<string, CompareOpFn> = {
  TRUTHY: (a) => isTruthyValue(a),
  FALSY: (a) => !isTruthyValue(a),
  NOT_TRUTHY: (a) => !isTruthyValue(a),
  IS_EMPTY: (a) => isEmptyValue(a),
  EMPTY: (a) => isEmptyValue(a),
  IS_NOT_EMPTY: (a) => !isEmptyValue(a),
  NOT_EMPTY: (a) => !isEmptyValue(a),
  EQUALS: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA === numB, (valA, valB) => valA == valB), // oxlint-disable-line eqeqeq
  EQ: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA === numB, (valA, valB) => valA == valB), // oxlint-disable-line eqeqeq
  '==': (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA === numB, (valA, valB) => valA == valB), // oxlint-disable-line eqeqeq
  STRICT_EQUALS: (a, b) => a === b,
  SEQ: (a, b) => a === b,
  '===': (a, b) => a === b,
  NOT_EQUALS: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA !== numB, (valA, valB) => valA != valB), // oxlint-disable-line eqeqeq
  NEQ: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA !== numB, (valA, valB) => valA != valB), // oxlint-disable-line eqeqeq
  '!=': (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA !== numB, (valA, valB) => valA != valB), // oxlint-disable-line eqeqeq
  GREATER_THAN: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA > numB, (valA, valB) => safeToString(valA) > safeToString(valB)),
  GT: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA > numB, (valA, valB) => safeToString(valA) > safeToString(valB)),
  '>': (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA > numB, (valA, valB) => safeToString(valA) > safeToString(valB)),
  GREATER_EQUAL: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA >= numB, (valA, valB) => safeToString(valA) >= safeToString(valB)),
  GTE: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA >= numB, (valA, valB) => safeToString(valA) >= safeToString(valB)),
  '>=': (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA >= numB, (valA, valB) => safeToString(valA) >= safeToString(valB)),
  LESS_THAN: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA < numB, (valA, valB) => safeToString(valA) < safeToString(valB)),
  LT: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA < numB, (valA, valB) => safeToString(valA) < safeToString(valB)),
  '<': (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA < numB, (valA, valB) => safeToString(valA) < safeToString(valB)),
  LESS_EQUAL: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA <= numB, (valA, valB) => safeToString(valA) <= safeToString(valB)),
  LTE: (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA <= numB, (valA, valB) => safeToString(valA) <= safeToString(valB)),
  '<=': (a, b) => compareNumbersOrValues(a, b, (numA, numB) => numA <= numB, (valA, valB) => safeToString(valA) <= safeToString(valB)),
}

export const COMPARE_EXPR_TEMPLATES: Record<string, (a: string, b: string) => string> = {
  EQUALS: (a, b) => `((${a}) == (${b}))`,
  EQ: (a, b) => `((${a}) == (${b}))`,
  '==': (a, b) => `((${a}) == (${b}))`,
  STRICT_EQUALS: (a, b) => `((${a}) === (${b}))`,
  SEQ: (a, b) => `((${a}) === (${b}))`,
  '===': (a, b) => `((${a}) === (${b}))`,
  NOT_EQUALS: (a, b) => `((${a}) != (${b}))`,
  NEQ: (a, b) => `((${a}) != (${b}))`,
  '!=': (a, b) => `((${a}) != (${b}))`,
  GREATER_THAN: (a, b) => `((${a}) > (${b}))`,
  GT: (a, b) => `((${a}) > (${b}))`,
  '>': (a, b) => `((${a}) > (${b}))`,
  GREATER_EQUAL: (a, b) => `((${a}) >= (${b}))`,
  GTE: (a, b) => `((${a}) >= (${b}))`,
  '>=': (a, b) => `((${a}) >= (${b}))`,
  LESS_THAN: (a, b) => `((${a}) < (${b}))`,
  LT: (a, b) => `((${a}) < (${b}))`,
  '<': (a, b) => `((${a}) < (${b}))`,
  LESS_EQUAL: (a, b) => `((${a}) <= (${b}))`,
  LTE: (a, b) => `((${a}) <= (${b}))`,
  '<=': (a, b) => `((${a}) <= (${b}))`,
  TRUTHY: (a) => `Boolean(${a})`,
  FALSY: (a) => `(!Boolean(${a}))`,
  IS_EMPTY: (a) => `((${a}) == null || (${a}) === '' || (Array.isArray(${a}) && (${a}).length === 0))`,
  IS_NOT_EMPTY: (a) => `(!(${a} == null || (${a}) === '' || (Array.isArray(${a}) && (${a}).length === 0)))`,
}
