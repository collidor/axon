// oxlint-disable typescript/no-explicit-any
import { BaseGraph } from '../core/base.graph'
import { kahnTopologicalSort } from '../core/kahnTopologicalSort'
import type {
  CompileOptions,
  CompilationResult,
  GraphInputSource,
  NodeCompileContext,
  BenchmarkResult,
} from './compiler.types'
import { defaultNodeCompilers } from './nodeCompilers'
import { NODE_TYPES } from '../nodes/nodes.constants'

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_$]/g, '_')
}

function parsePortId(portId: string): { nodeId: string; portName: string } {
  const colonIndex = portId.indexOf(':')
  if (colonIndex === -1) {
    return { nodeId: portId, portName: 'default' }
  }
  return {
    nodeId: portId.slice(0, colonIndex),
    portName: portId.slice(colonIndex + 1),
  }
}

interface NormalizedGraph {
  nodes: { id: string; type: string; data?: any }[]
  edges: [string, string][]
}

function normalizeGraph(source: GraphInputSource): NormalizedGraph {
  if (source instanceof BaseGraph) {
    const nodes = Array.from(source.nodes.values()).map((n) => ({
      id: n.id,
      type: n.nodeType,
      data: n.data,
    }))
    const edges = source.edges
    return { nodes, edges }
  }

  // SerializedGraph
  return {
    nodes: source.nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
    edges: source.edges.map((e) => [e.from, e.to] as [string, string]),
  }
}

/**
 * Compiles an Axon Graph into pure, dependency-free JavaScript or TypeScript code,
 * or returns an executable high-performance JIT function closure.
 */
export function compileGraph(
  source: GraphInputSource,
  options: CompileOptions = {},
): CompilationResult {
  const {
    functionName = 'executeCompiledGraph',
    target = 'function',
    typescript = target === 'typescript',
    optimizeDeadCode = true,
    customCompilers = {},
  } = options

  const { nodes, edges } = normalizeGraph(source)

  if (nodes.length === 0) {
    const emptySource = `${typescript ? 'export function ' : 'function '}${functionName}(inputs = {}) {\n  return {};\n}`
    return {
      source: emptySource,
      fn: target === 'function' ? new Function('inputs', 'return {};') as any : undefined,
      inputKeys: [],
      outputKeys: [],
      compiledNodeCount: 0,
    }
  }

  // 1. Edge maps: toPort -> fromPort, and incoming/outgoing edges per node
  const incomingEdgeMap = new Map<string, string>() // toPort -> fromPort
  const outgoingEdgeMap = new Map<string, Set<string>>() // fromPort -> Set<toPort>
  const nodeEdges: [string, string][] = []

  for (const [from, to] of edges) {
    incomingEdgeMap.set(to, from)
    if (!outgoingEdgeMap.has(from)) {
      outgoingEdgeMap.set(from, new Set())
    }
    outgoingEdgeMap.get(from)!.add(to)

    const fromNode = parsePortId(from).nodeId
    const toNode = parsePortId(to).nodeId
    if (fromNode !== toNode) {
      nodeEdges.push([fromNode, toNode])
    }
  }

  // 2. Identify Entry Inputs & Outputs
  const groupInputNodes = nodes.filter(
    (n) => n.type === NODE_TYPES.GROUP_INPUT || n.type === 'group-input',
  )
  const groupOutputNodes = nodes.filter(
    (n) => n.type === NODE_TYPES.GROUP_OUTPUT || n.type === 'group-output',
  )

  const inferredInputKeys = new Set<string>()
  if (options.entryInputs && options.entryInputs.length > 0) {
    options.entryInputs.forEach((k) => inferredInputKeys.add(k))
  } else if (groupInputNodes.length > 0) {
    groupInputNodes.forEach((n) => {
      const name = n.data?.name || n.id
      inferredInputKeys.add(name)
    })
  } else {
    // Collect all inputs with no incoming edge
    for (const node of nodes) {
      // If node is math, logic, compare, etc., expose unconnected ports
      if (node.type === NODE_TYPES.MATH || node.type === 'math-node') {
        if (!incomingEdgeMap.has(`${node.id}:a`)) inferredInputKeys.add(`${node.id}_a`)
        if (!incomingEdgeMap.has(`${node.id}:b`)) inferredInputKeys.add(`${node.id}_b`)
      } else if (node.type === NODE_TYPES.LOGIC || node.type === 'logic-node') {
        if (!incomingEdgeMap.has(`${node.id}:a`)) inferredInputKeys.add(`${node.id}_a`)
        if (!incomingEdgeMap.has(`${node.id}:b`)) inferredInputKeys.add(`${node.id}_b`)
      }
    }
  }

  // Outputs to return
  const targetOutputs = new Map<string, string>() // exportKey -> portId
  if (options.entryOutputs && options.entryOutputs.length > 0) {
    for (const key of options.entryOutputs) {
      const portId = key.includes(':') ? key : `${key}:output`
      targetOutputs.set(key.replace(/:/g, '_'), portId)
    }
  } else if (groupOutputNodes.length > 0) {
    for (const n of groupOutputNodes) {
      const key = n.data?.name || n.id
      targetOutputs.set(key, `${n.id}:value`)
    }
  } else {
    // Collect terminal nodes (outputs with no outgoing edges)
    const terminalOutputs = new Set<string>()
    for (const node of nodes) {
      const candidates = [`${node.id}:result`, `${node.id}:output`, `${node.id}:payload`, `${node.id}:value`]
      for (const cand of candidates) {
        if (!outgoingEdgeMap.has(cand) || outgoingEdgeMap.get(cand)!.size === 0) {
          // Check if this node actually produces this output
          terminalOutputs.add(cand)
        }
      }
    }
    for (const portId of terminalOutputs) {
      const { nodeId, portName } = parsePortId(portId)
      targetOutputs.set(`${sanitizeId(nodeId)}_${sanitizeId(portName)}`, portId)
    }
  }

  // 3. Dead-Code Elimination: Backward walk from target outputs
  const activeNodeIds = new Set<string>()
  if (optimizeDeadCode && targetOutputs.size > 0) {
    const queue: string[] = []
    for (const portId of targetOutputs.values()) {
      queue.push(parsePortId(portId).nodeId)
    }

    const visited = new Set<string>()
    while (queue.length > 0) {
      const curId = queue.shift()!
      if (visited.has(curId)) continue
      visited.add(curId)
      activeNodeIds.add(curId)

      // Find all incoming ports for curId and traverse backward
      for (const [toPort, fromPort] of incomingEdgeMap.entries()) {
        if (parsePortId(toPort).nodeId === curId) {
          const upstreamNodeId = parsePortId(fromPort).nodeId
          if (!visited.has(upstreamNodeId)) {
            queue.push(upstreamNodeId)
          }
        }
      }
    }
  } else {
    for (const n of nodes) activeNodeIds.add(n.id)
  }

  // 4. Topological Sort with Kahn's algorithm
  const filteredNodes = nodes.filter((n) => activeNodeIds.has(n.id))
  const filteredNodeEdges = nodeEdges.filter(
    ([from, to]) => activeNodeIds.has(from) && activeNodeIds.has(to),
  )

  const topoResult = kahnTopologicalSort(
    filteredNodes.map((n) => ({ id: n.id })),
    filteredNodeEdges,
  )

  const orderedNodeIds = topoResult.success
    ? topoResult.value.result
    : filteredNodes.map((n) => n.id)

  const nodeMap = new Map<string, { id: string; type: string; data?: any }>()
  for (const n of filteredNodes) nodeMap.set(n.id, n)

  // 5. Code Emission
  const helpers = new Map<string, string>()
  const portToVarName = new Map<string, string>() // portId -> varName
  const lines: string[] = []

  const formatLiteral = (v: unknown): string => {
    if (v === undefined) return 'undefined'
    if (v === null) return 'null'
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (typeof v === 'string') return JSON.stringify(v)
    return JSON.stringify(v)
  }

  for (const nodeId of orderedNodeIds) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    const sNodeId = sanitizeId(node.id)
    const inputs: Record<string, string> = {}

    // Resolve inputs from incoming edges or defaults/entryInputs
    // Look at incoming edges connected to this node
    for (const [toPort, fromPort] of incomingEdgeMap.entries()) {
      const parsedTo = parsePortId(toPort)
      if (parsedTo.nodeId === node.id) {
        const sourceVar = portToVarName.get(fromPort)
        if (sourceVar) {
          inputs[parsedTo.portName] = sourceVar
        }
      }
    }

    // Check entry inputs or node data fallbacks for missing inputs
    const checkInput = (portName: string, defaultVal?: unknown) => {
      if (!(portName in inputs)) {
        const directKey = `${node.id}_${portName}`
        const colonKey = `${node.id}:${portName}`
        const shortKey = portName
        const fallback = defaultVal !== undefined ? defaultVal : node.data?.[portName]
        inputs[portName] = `(inputs?.[${JSON.stringify(directKey)}] ?? inputs?.[${JSON.stringify(colonKey)}] ?? inputs?.[${JSON.stringify(shortKey)}] ?? ${formatLiteral(fallback)})`
      }
    }

    const RESERVED_METADATA_KEYS = new Set([
      'operator',
      'structName',
      'componentName',
      'targetType',
      'fields',
      'struct',
      'schema',
      'validate',
      'id',
      'type',
      'x',
      'y',
      'label',
      'nodeType',
    ])

    if (source instanceof BaseGraph) {
      const baseNode = source.getNode(node.id)
      if (baseNode) {
        for (const portName of baseNode.inputNames) {
          const strName = String(portName)
          if (!RESERVED_METADATA_KEYS.has(strName) || incomingEdgeMap.has(`${node.id}:${strName}`)) {
            checkInput(strName, baseNode.getInput(portName) ?? node.data?.[strName])
          }
        }
      }
    }

    // Standard schema fallback checks for common node input ports
    if (node.type === NODE_TYPES.MATH || node.type === 'math-node') {
      checkInput('a', node.data?.a ?? 0)
      checkInput('b', node.data?.b ?? 0)
      if (incomingEdgeMap.has(`${node.id}:operator`)) checkInput('operator', node.data?.operator ?? 'ADD')
    } else if (node.type === NODE_TYPES.LOGIC || node.type === 'logic-node') {
      checkInput('a', node.data?.a ?? false)
      checkInput('b', node.data?.b ?? false)
      if (incomingEdgeMap.has(`${node.id}:operator`)) checkInput('operator', node.data?.operator ?? 'AND')
    } else if (node.type === NODE_TYPES.COMPARE || node.type === 'compare-node') {
      checkInput('a', node.data?.a ?? 0)
      checkInput('b', node.data?.b ?? 0)
      if (incomingEdgeMap.has(`${node.id}:operator`)) checkInput('operator', node.data?.operator ?? 'EQUALS')
    } else if (node.type === NODE_TYPES.GATE || node.type === 'gate-node') {
      checkInput('open', node.data?.open ?? false)
      checkInput('data', node.data?.data ?? null)
    } else if (node.type === NODE_TYPES.TYPE_CONVERT || node.type === 'type-convert-node') {
      checkInput('input', node.data?.input ?? '')
    } else if (node.type === NODE_TYPES.EXTRACT_COMPONENT || node.type === 'extract-component-node') {
      checkInput('entity', node.data?.entity ?? null)
      if (incomingEdgeMap.has(`${node.id}:componentName`)) checkInput('componentName', node.data?.componentName ?? 'Position')
    } else if (node.type === NODE_TYPES.GROUP_OUTPUT || node.type === 'group-output') {
      checkInput('value', node.data?.value ?? null)
    }

    if (node.data && typeof node.data === 'object') {
      for (const [k, v] of Object.entries(node.data)) {
        if (!k.startsWith('_') && !RESERVED_METADATA_KEYS.has(k)) {
          checkInput(k, v)
        }
      }
    }

    // Context for node compiler
    const emittedOutputs = new Map<string, string>()

    const ctx: NodeCompileContext = {
      nodeId: node.id,
      nodeType: node.type,
      nodeData: node.data,
      inputs,
      emitOutput: (outputName: string, expr: string) => {
        emittedOutputs.set(outputName, expr)
      },
      registerHelper: (name: string, impl: string) => {
        helpers.set(name, impl)
      },
      formatLiteral,
    }

    const compiler =
      customCompilers[node.type] ||
      defaultNodeCompilers[node.type] ||
      defaultNodeCompilers[node.type.replace(/-node$/, '')]

    if (compiler) {
      compiler(ctx)
    } else {
      // Fallback compiler for unknown node types
      const expr = formatLiteral(node.data?.value ?? null)
      ctx.emitOutput('output', expr)
    }

    // Emit variable declarations for each emitted output
    for (const [outputName, expr] of emittedOutputs.entries()) {
      const varName = `_${sNodeId}_${sanitizeId(outputName)}`
      portToVarName.set(`${node.id}:${outputName}`, varName)
      lines.push(`  const ${varName} = ${expr};`)
    }
  }

  // 6. Return statement
  const returnProps: string[] = []
  for (const [exportKey, portId] of targetOutputs.entries()) {
    const varName = portToVarName.get(portId)
    if (varName) {
      returnProps.push(`    ${JSON.stringify(exportKey)}: ${varName}`)
    } else {
      returnProps.push(`    ${JSON.stringify(exportKey)}: undefined`)
    }
  }

  const helperDeclarations = Array.from(helpers.values()).join('\n')

  const functionSignature = typescript
    ? `export function ${functionName}(inputs: Record<string, any> = {}): Record<string, any>`
    : target === 'esm'
      ? `export function ${functionName}(inputs = {})`
      : `function ${functionName}(inputs = {})`

  const body = [
    ...lines,
    `  return {`,
    returnProps.join(',\n'),
    `  };`,
  ].join('\n')

  const fullSource = [
    `// Auto-generated by @collidor/axon Graph Compiler`,
    helperDeclarations ? `${helperDeclarations}\n` : '',
    `${functionSignature} {`,
    body,
    `}`,
  ]
    .filter(Boolean)
    .join('\n')

  // Create live executable function for JIT execution
  let compiledFn: ((inputs?: Record<string, any>) => Record<string, any>) | undefined
  if (target === 'function') {
    const fnBody = [
      helperDeclarations,
      lines.join('\n'),
      `return {\n${returnProps.join(',\n')}\n};`,
    ].join('\n')

    try {
      // oxlint-disable-next-line typescript/no-implied-eval
      compiledFn = new Function('inputs = {}', fnBody) as any
    } catch (e) {
      console.error('[Axon Compiler] Failed to create JIT function:', e)
    }
  }

  return {
    source: fullSource,
    fn: compiledFn,
    inputKeys: Array.from(inferredInputKeys),
    outputKeys: Array.from(targetOutputs.keys()),
    compiledNodeCount: filteredNodes.length,
  }
}

/**
 * Shorthand helper that returns only the executable function.
 */
export function compileToFunction(
  source: GraphInputSource,
  options?: Omit<CompileOptions, 'target'>,
): (inputs?: Record<string, any>) => Record<string, any> {
  const result = compileGraph(source, { ...options, target: 'function' })
  if (!result.fn) {
    throw new Error('[Axon] Failed to compile graph into executable JavaScript function.')
  }
  return result.fn
}

/**
 * Shorthand helper that returns the formatted source code string.
 */
export function compileToSource(
  source: GraphInputSource,
  options?: Omit<CompileOptions, 'target'>,
): string {
  return compileGraph(source, { ...options, target: options?.typescript ? 'typescript' : 'esm' }).source
}

/**
 * Benchmarks a compiled function against the dynamic BaseGraph execution loop,
 * executing a given number of iterations and returning performance metrics.
 */
export function benchmarkCompiled(
  graph: BaseGraph,
  sampleInputs: Record<string, any>,
  iterations: number = 10000,
): BenchmarkResult {
  const compiledFn = compileToFunction(graph)

  // 1. Warm-up
  for (let i = 0; i < 100; i++) {
    compiledFn(sampleInputs)
  }

  // 2. Measure Compiled Function
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    compiledFn(sampleInputs)
  }
  const t1 = performance.now()
  const compiledDurationMs = Math.max(t1 - t0, 0.0001)

  // 3. Measure Dynamic BaseGraph Execution
  const t2 = performance.now()
  for (let i = 0; i < iterations; i++) {
    for (const [key, val] of Object.entries(sampleInputs)) {
      graph.setPortValue(key, val)
    }
    graph.flush()
  }
  const t3 = performance.now()
  const dynamicDurationMs = Math.max(t3 - t2, 0.0001)

  const compiledOpsPerSec = Math.round((iterations / (compiledDurationMs / 1000)))
  const dynamicOpsPerSec = Math.round((iterations / (dynamicDurationMs / 1000)))
  const speedupMultiplier = Number((compiledOpsPerSec / Math.max(dynamicOpsPerSec, 1)).toFixed(2))

  return {
    iterations,
    compiledDurationMs,
    dynamicDurationMs,
    compiledOpsPerSec,
    dynamicOpsPerSec,
    speedupMultiplier,
  }
}
