import { describe, it, expect } from 'vitest'
import { BaseGraph } from '../../core/base.graph'
import { createMathNode } from '../../nodes/math.node'
import { createLogicNode } from '../../nodes/logic.node'
import { createCompareNode } from '../../nodes/compare.node'
import { createGateNode } from '../../nodes/gate.node'
import { createConstantNode } from '../../nodes/constant.node'
import { createGroupInputNode, createGroupOutputNode } from '../../nodes/subgraph.node'
import { createComposeStructNode } from '../../nodes/composeStruct.node'
import { createExtractComponentNode } from '../../nodes/extractComponent.node'
import {
  compileGraph,
  compileToFunction,
  compileToSource,
  benchmarkCompiled,
} from '../graphCompiler'

describe('Graph Compilation and Zero-Overhead Code Generation (Ticket 008)', () => {
  describe('Arithmetic DAG Compilation', () => {
    it('compiles a chained math calculation into a pure JIT function', () => {
      const graph = new BaseGraph()

      const addNode = createMathNode({
        id: 'adder',
        initialData: { a: 10, b: 5, operator: 'ADD' },
      })
      const multNode = createMathNode({
        id: 'multiplier',
        initialData: { b: 3, operator: 'MULTIPLY' },
      })

      graph.addNode(addNode)
      graph.addNode(multNode)
      graph.addEdge('adder:result', 'multiplier:a')

      const compiledFn = compileToFunction(graph)

      // Test with default node data: (10 + 5) * 3 = 45
      const res1 = compiledFn()
      expect(res1.multiplier_result).toBe(45)

      // Test with dynamic inputs: (20 + 30) * 3 = 150
      const res2 = compiledFn({ adder_a: 20, adder_b: 30 })
      expect(res2.multiplier_result).toBe(150)
    })

    it('generates formatted TypeScript source code', () => {
      const graph = new BaseGraph()
      const math = createMathNode({
        id: 'doubler',
        initialData: { a: 10, b: 2, operator: 'MULTIPLY' },
      })
      graph.addNode(math)

      const source = compileToSource(graph, { typescript: true, functionName: 'doubleCalculation' })
      expect(source).toContain('export function doubleCalculation(inputs: Record<string, any> = {}): Record<string, any>')
      expect(source).toContain('const _doubler_result =')
      expect(source).toContain('return {')
      expect(source).toContain('"doubler_result": _doubler_result')
    })
  })

  describe('Logic and Comparison DAG Compilation', () => {
    it('compiles compare and boolean logic operations', () => {
      const graph = new BaseGraph()

      const compNode = createCompareNode({
        id: 'comp',
        initialData: { a: 10, b: 5, operator: 'GREATER_THAN' },
      })
      const logicNode = createLogicNode({
        id: 'logic',
        initialData: { b: true, operator: 'AND' },
      })

      graph.addNode(compNode)
      graph.addNode(logicNode)
      graph.addEdge('comp:result', 'logic:a')

      const fn = compileToFunction(graph)

      // 10 > 5 is true, true AND true is true
      const resTrue = fn()
      expect(resTrue.logic_result).toBe(true)

      // 2 > 5 is false, false AND true is false
      const resFalse = fn({ comp_a: 2, comp_b: 5 })
      expect(resFalse.logic_result).toBe(false)
    })

    it('inlines constant literals and gate conditional routing', () => {
      const graph = new BaseGraph()

      const constNode = createConstantNode({
        id: 'constPayload',
        initialData: { value: 'Secret Treasure' },
      })
      const gateNode = createGateNode({
        id: 'gate',
        initialData: { open: false },
      })

      graph.addNode(constNode)
      graph.addNode(gateNode)
      graph.addEdge('constPayload:value', 'gate:data')

      const fn = compileToFunction(graph)

      // When closed: output is undefined
      expect(fn({ gate_open: false }).gate_output).toBeUndefined()

      // When open: output flows through
      expect(fn({ gate_open: true }).gate_output).toBe('Secret Treasure')
    })
  })

  describe('Struct Composition and Component Extraction', () => {
    it('compiles struct composition and component extraction', () => {
      const graph = new BaseGraph()

      const compNode = createExtractComponentNode({
        id: 'extractor',
        initialData: { componentName: 'Position' },
      })
      const structNode = createComposeStructNode({
        id: 'composer',
        initialData: { structName: 'MoveIntent' },
      })

      graph.addNode(compNode)
      graph.addNode(structNode)
      graph.addEdge('extractor:component', 'composer:targetPos')

      const fn = compileToFunction(graph)

      const entity = {
        id: 'player-1',
        position: { x: 100, y: 200 },
      }

      const res = fn({ extractor_entity: entity })
      expect(res.composer_output).toEqual({
        targetPos: { x: 100, y: 200 },
      })
    })
  })

  describe('Boundary Subgraph IO Compilation', () => {
    it('compiles GroupInput and GroupOutput nodes into clean function arguments and returns', () => {
      const graph = new BaseGraph()

      const inputNode = createGroupInputNode({
        id: 'in1',
        initialData: { name: 'speed', default: 5 },
      })
      const multNode = createMathNode({
        id: 'scaler',
        initialData: { b: 10, operator: 'MULTIPLY' },
      })
      const outputNode = createGroupOutputNode({
        id: 'out1',
        initialData: { name: 'scaledSpeed' },
      })

      graph.addNode(inputNode)
      graph.addNode(multNode)
      graph.addNode(outputNode)

      graph.addEdge('in1:value', 'scaler:a')
      graph.addEdge('scaler:result', 'out1:value')

      const fn = compileToFunction(graph)

      // Default speed: 5 * 10 = 50
      expect(fn()).toEqual({ scaledSpeed: 50 })

      // Custom speed input: 12 * 10 = 120
      expect(fn({ speed: 12 })).toEqual({ scaledSpeed: 120 })
    })
  })

  describe('Dead-Code Elimination', () => {
    it('prunes unused nodes that do not reach target outputs', () => {
      const graph = new BaseGraph()

      const activeAdder = createMathNode({
        id: 'active',
        initialData: { a: 1, b: 2, operator: 'ADD' },
      })
      const deadNode = createMathNode({
        id: 'unusedSideEffect',
        initialData: { a: 999, b: 999, operator: 'POWER' },
      })

      graph.addNode(activeAdder)
      graph.addNode(deadNode)

      const result = compileGraph(graph, {
        entryOutputs: ['active:result'],
        optimizeDeadCode: true,
      })

      // The compiled code should only contain the active node
      expect(result.compiledNodeCount).toBe(1)
      expect(result.source).toContain('const _active_result =')
      expect(result.source).not.toContain('_unusedSideEffect_')

      const fn = result.fn!
      expect(fn()).toEqual({ active_result: 3 })
    })
  })

  describe('SerializedGraph, Custom Compilers & Type Conversion', () => {
    it('compiles a SerializedGraph directly without requiring BaseGraph instance', () => {
      const serialized = {
        nodes: [
          { id: 'num', type: 'constant-node', x: 0, y: 0, data: { value: '42' } },
          { id: 'conv', type: 'type-convert-node', x: 100, y: 0, data: { targetType: 'number' } },
          { id: 'math', type: 'math-node', x: 200, y: 0, data: { b: 8, operator: 'ADD' } },
        ],
        edges: [
          { from: 'num:value', to: 'conv:input' },
          { from: 'conv:output', to: 'math:a' },
        ],
      }

      const fn = compileToFunction(serialized)
      const res = fn()
      expect(res.math_result).toBe(50)
    })

    it('supports custom node compiler plugins', () => {
      const graph = new BaseGraph()
      const n = createMathNode({ id: 'customTest', initialData: { a: 7 } })
      graph.addNode(n)

      const result = compileGraph(graph, {
        customCompilers: {
          'math-node': (ctx) => {
            ctx.emitOutput('result', `(${ctx.inputs.a ?? 0} * 1000)`)
          },
        },
      })

      const fn = result.fn!
      expect(fn({ customTest_a: 7 })).toEqual({ customTest_result: 7000 })
    })

    it('handles empty graphs safely', () => {
      const graph = new BaseGraph()
      const result = compileGraph(graph)
      expect(result.compiledNodeCount).toBe(0)
      expect(result.fn!()).toEqual({})
    })
  })

  describe('JIT Benchmarking and Performance Comparison', () => {
    it('measures execution speedup between compiled function and dynamic graph', () => {
      const graph = new BaseGraph()

      const n1 = createMathNode({ id: 'm1', initialData: { a: 10, b: 20, operator: 'ADD' } })
      const n2 = createMathNode({ id: 'm2', initialData: { b: 5, operator: 'MULTIPLY' } })
      const n3 = createMathNode({ id: 'm3', initialData: { b: 2, operator: 'DIVIDE' } })

      graph.addNode(n1)
      graph.addNode(n2)
      graph.addNode(n3)

      graph.addEdge('m1:result', 'm2:a')
      graph.addEdge('m2:result', 'm3:a')

      const sampleInputs = { m1_a: 15, m1_b: 25 }
      const bench = benchmarkCompiled(graph, sampleInputs, 2000)

      expect(bench.iterations).toBe(2000)
      expect(bench.compiledDurationMs).toBeGreaterThan(0)
      expect(bench.dynamicDurationMs).toBeGreaterThan(0)
      expect(bench.compiledOpsPerSec).toBeGreaterThan(1000)
      expect(bench.speedupMultiplier).toBeGreaterThan(0.5)
    })
  })
})
