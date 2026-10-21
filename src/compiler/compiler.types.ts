// oxlint-disable typescript/no-explicit-any
import type { BaseGraph } from '../core/base.graph'
import type { SerializedGraph } from '../core/serialization'

export type CompilationTarget = 'function' | 'typescript' | 'esm'

export interface CompileOptions {
  /**
   * Name of the exported/compiled function.
   * Default: 'executeCompiledGraph'
   */
  functionName?: string

  /**
   * Explicit input port mappings to expose as function argument keys.
   * Format: ['nodeId:portName'] or ['portName'].
   * If omitted, all unconnected or group-input ports are automatically inferred.
   */
  entryInputs?: string[]

  /**
   * Explicit output port mappings to return from the function.
   * Format: ['nodeId:portName'] or ['portName'].
   * If omitted, all terminal/group-output ports are returned.
   */
  entryOutputs?: string[]

  /**
   * Target format:
   * - 'function': compiles to a live JavaScript Function (via new Function).
   * - 'typescript': generates typed TypeScript source code string.
   * - 'esm': generates pure ECMAScript module export string.
   * Default: 'function'
   */
  target?: CompilationTarget

  /**
   * Include TypeScript type annotations in the generated source code.
   * Default: false for JS, true if target is 'typescript'.
   */
  typescript?: boolean

  /**
   * Prune nodes that do not contribute to any specified entry outputs.
   * Default: true
   */
  optimizeDeadCode?: boolean

  /**
   * Custom node compilers to extend or override default compilers.
   */
  customCompilers?: Record<string, NodeCompilerFn>
}

export interface NodeCompileContext {
  /**
   * The unique node ID.
   */
  nodeId: string

  /**
   * Node type string (e.g. 'math-node').
   */
  nodeType: string

  /**
   * Stored node data / configuration.
   */
  nodeData: any

  /**
   * Map from input port name to the resolved JavaScript expression.
   */
  inputs: Record<string, string>

  /**
   * Emits an output port expression.
   */
  emitOutput: (outputName: string, expression: string) => void

  /**
   * Registers a shared helper function in the compiled closure/module.
   */
  registerHelper: (name: string, implementation: string) => void

  /**
   * Safely formats an arbitrary value to a valid JS literal string.
   */
  formatLiteral: (value: unknown) => string
}

export type NodeCompilerFn = (ctx: NodeCompileContext) => void | string

export interface CompilationResult {
  /**
   * The generated source code.
   */
  source: string

  /**
   * The executable function if compiled with target='function'.
   */
  fn?: (inputs?: Record<string, any>) => Record<string, any>

  /**
   * Array of resolved input argument names.
   */
  inputKeys: string[]

  /**
   * Array of resolved output return names.
   */
  outputKeys: string[]

  /**
   * Number of nodes inlined in the compiled function.
   */
  compiledNodeCount: number
}

export interface BenchmarkResult {
  iterations: number
  compiledDurationMs: number
  dynamicDurationMs: number
  compiledOpsPerSec: number
  dynamicOpsPerSec: number
  speedupMultiplier: number
}

export type GraphInputSource = BaseGraph | SerializedGraph
