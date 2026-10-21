import { NODE_TYPES } from '../nodes/nodes.constants'
import {
  MATH_EXPR_TEMPLATES,
  LOGIC_EXPR_TEMPLATES,
  COMPARE_EXPR_TEMPLATES,
} from '../nodes/operationMaps'
import type { NodeCompilerFn } from './compiler.types'

function createDispatchHelper(
  helperName: string,
  mapName: string,
  templates: Record<string, (a: string, b: string) => string>,
  defaultReturn: string,
): string {
  const entries = Object.entries(templates)
    .map(([key, fn]) => `  ${JSON.stringify(key)}: (a, b) => ${fn('a', 'b')}`)
    .join(',\n')
  return `const ${mapName} = {\n${entries}\n};\nfunction ${helperName}(op, a, b) {\n  const fn = ${mapName}[String(op).toUpperCase()];\n  return fn ? fn(a, b) : ${defaultReturn};\n}`
}

export const defaultNodeCompilers: Record<string, NodeCompilerFn> = {
  // --- Math Node ---
  [NODE_TYPES.MATH]: (ctx) => {
    const a = ctx.inputs.a ?? ctx.formatLiteral(ctx.nodeData?.a ?? 0)
    const b = ctx.inputs.b ?? ctx.formatLiteral(ctx.nodeData?.b ?? 0)

    if (ctx.inputs.operator) {
      ctx.registerHelper(
        'evalMathOp',
        createDispatchHelper('evalMathOp', 'mathOpMap', MATH_EXPR_TEMPLATES, '0'),
      )
      ctx.emitOutput('result', `evalMathOp(${ctx.inputs.operator}, ${a}, ${b})`)
      return
    }

    const op = String(ctx.nodeData?.operator || 'ADD').toUpperCase()
    const template = MATH_EXPR_TEMPLATES[op]
    const expr = template ? template(a, b) : '0'
    ctx.emitOutput('result', expr)
  },

  // --- Logic Node ---
  [NODE_TYPES.LOGIC]: (ctx) => {
    const a = ctx.inputs.a ?? ctx.formatLiteral(Boolean(ctx.nodeData?.a))
    const b = ctx.inputs.b ?? ctx.formatLiteral(Boolean(ctx.nodeData?.b))

    if (ctx.inputs.operator) {
      ctx.registerHelper(
        'evalLogicOp',
        createDispatchHelper('evalLogicOp', 'logicOpMap', LOGIC_EXPR_TEMPLATES, 'false'),
      )
      ctx.emitOutput('result', `evalLogicOp(${ctx.inputs.operator}, ${a}, ${b})`)
      return
    }

    const op = String(ctx.nodeData?.operator || 'AND').toUpperCase()
    const template = LOGIC_EXPR_TEMPLATES[op]
    const expr = template ? template(a, b) : 'false'
    ctx.emitOutput('result', expr)
  },

  // --- Compare Node ---
  [NODE_TYPES.COMPARE]: (ctx) => {
    const a = ctx.inputs.a ?? ctx.formatLiteral(ctx.nodeData?.a ?? 0)
    const b = ctx.inputs.b ?? ctx.formatLiteral(ctx.nodeData?.b ?? 0)

    if (ctx.inputs.operator) {
      ctx.registerHelper(
        'evalCompareOp',
        createDispatchHelper('evalCompareOp', 'compareOpMap', COMPARE_EXPR_TEMPLATES, 'false'),
      )
      ctx.emitOutput('result', `evalCompareOp(${ctx.inputs.operator}, ${a}, ${b})`)
      return
    }

    const op = String(ctx.nodeData?.operator || 'EQUALS').toUpperCase()
    const template = COMPARE_EXPR_TEMPLATES[op]
    const expr = template ? template(a, b) : 'false'
    ctx.emitOutput('result', expr)
  },

  // --- Gate Node ---
  [NODE_TYPES.GATE]: (ctx) => {
    const open = ctx.inputs.open ?? ctx.formatLiteral(Boolean(ctx.nodeData?.open))
    const data = ctx.inputs.data ?? ctx.formatLiteral(ctx.nodeData?.data ?? null)
    const expr = `(Boolean(${open}) ? (${data}) : undefined)`
    ctx.emitOutput('output', expr)
  },

  // --- Constant Node ---
  [NODE_TYPES.CONSTANT]: (ctx) => {
    const rawVal = ctx.nodeData?.value ?? ctx.nodeData?.val ?? null
    const expr = ctx.formatLiteral(rawVal)
    ctx.emitOutput('value', expr)
    ctx.emitOutput('output', expr)
  },

  // --- Type Convert Node ---
  [NODE_TYPES.TYPE_CONVERT]: (ctx) => {
    const input = ctx.inputs.input ?? ctx.formatLiteral(ctx.nodeData?.input ?? '')
    const targetType = String(ctx.nodeData?.targetType ?? 'string').toLowerCase()

    let expr: string
    switch (targetType) {
      case 'number':
        expr = `Number(${input})`
        break
      case 'boolean':
        expr = `Boolean(${input})`
        break
      case 'json':
        ctx.registerHelper(
          'safeParseJson',
          'function safeParseJson(v) { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } }',
        )
        expr = `safeParseJson(${input})`
        break
      case 'string':
      default:
        expr = `String(${input})`
        break
    }
    ctx.emitOutput('output', expr)
  },

  // --- Compose Struct Node ---
  [NODE_TYPES.COMPOSE_STRUCT]: (ctx) => {
    const reserved = new Set([
      'structName',
      'fields',
      'struct',
      'schema',
      'validate',
      'id',
      'type',
      'x',
      'y',
    ])
    const fields: string[] = []
    for (const [key, expr] of Object.entries(ctx.inputs)) {
      if (!reserved.has(key)) {
        fields.push(`${JSON.stringify(key)}: ${expr}`)
      }
    }
    // Also incorporate static default values from nodeData if not in inputs
    if (ctx.nodeData && typeof ctx.nodeData === 'object') {
      for (const [key, val] of Object.entries(ctx.nodeData)) {
        if (!reserved.has(key) && !(key in ctx.inputs) && val !== undefined) {
          fields.push(`${JSON.stringify(key)}: ${ctx.formatLiteral(val)}`)
        }
      }
    }
    const structExpr = `({ ${fields.join(', ')} })`
    ctx.emitOutput('payload', structExpr)
    ctx.emitOutput('output', structExpr)
    ctx.emitOutput('result', structExpr)
  },

  // --- Extract Component Node ---
  [NODE_TYPES.EXTRACT_COMPONENT]: (ctx) => {
    const entity = ctx.inputs.entity ?? ctx.formatLiteral(ctx.nodeData?.entity ?? null)
    const compName = String(ctx.nodeData?.componentName ?? 'Position')
    const lower = compName.charAt(0).toLowerCase() + compName.slice(1)
    const upper = compName.charAt(0).toUpperCase() + compName.slice(1)

    const extractExpr = `(((${entity})?.[${JSON.stringify(lower)}] ?? (${entity})?.[${JSON.stringify(upper)}]) ?? (${entity})?.[${JSON.stringify(compName)}])`
    ctx.emitOutput('component', extractExpr)
    ctx.emitOutput('hasComponent', `(Boolean(${extractExpr}))`)
    ctx.emitOutput('entity', entity)
  },

  // --- Group Input Node ---
  [NODE_TYPES.GROUP_INPUT]: (ctx) => {
    const portName = String(ctx.nodeData?.name || ctx.nodeId || 'input')
    const defaultVal = ctx.formatLiteral(ctx.nodeData?.default ?? ctx.nodeData?.value ?? 0)
    const expr = `(inputs?.[${JSON.stringify(portName)}] !== undefined ? inputs[${JSON.stringify(portName)}] : ${defaultVal})`
    ctx.emitOutput('value', expr)
    ctx.emitOutput('output', expr)
  },

  // --- Group Output Node ---
  [NODE_TYPES.GROUP_OUTPUT]: (ctx) => {
    const val = ctx.inputs.value ?? ctx.inputs.input ?? ctx.formatLiteral(ctx.nodeData?.value ?? null)
    ctx.emitOutput('value', val)
    ctx.emitOutput('output', val)
  },
}
