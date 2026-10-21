# Graph Compilation and Zero-Overhead Code Generation

`wayfinder:task`
Status: Complete

## Question

How can an Axon graph be compiled into pure, dependency-free TypeScript or ESM JavaScript functions that execute at native CPU speed without any runtime engine overhead?

## Context

Node graph engines often suffer from overhead when executing thousands of ticks per second (traversing adjacency lists, checking port mappings, creating context objects).

Since an Axon DAG has fixed topological ordering and known node expressions (e.g. math operations, logic checks, struct compositions), the entire DAG can be compiled ahead-of-time (AOT) into a single pure TypeScript function:
```ts
export function executeCompiledGraph(inputs: { trigger: boolean; a: number; b: number }) {
  const node1_result = inputs.a + inputs.b;
  const node2_result = node1_result * 2;
  return { output: node2_result };
}
```

## Implementation Details

1. **AOT & JIT Graph Compiler (`compileGraph`, `compileToFunction`, `compileToSource`)**:
   - Compiles any `BaseGraph` or `SerializedGraph` into standalone dependency-free TypeScript or ESM JavaScript code.
   - Leverages Kahn's topological sorting algorithm to inline calculations in optimal evaluation order.
   - Generates executable JIT closures via `new Function(...)` for instant in-process execution with zero graph runtime overhead.
2. **Built-in Node Compilers (`defaultNodeCompilers`)**:
   - Math operations (`+`, `-`, `*`, `/`, `**`, `%`): Inlined direct arithmetic without function calls; supports dynamic operator dispatch helpers.
   - Logic operations (`AND`, `OR`, `XOR`, `NAND`, `NOR`, `XNOR`, `NOT`): Inlined direct boolean algebra.
   - Compare operations (`==`, `===`, `!=`, `<`, `<=`, `>`, `>=`, truthy, empty): Inlined comparisons.
   - Flow control & gate: Inlined ternary conditional expressions (`open ? data : undefined`).
   - Constant literals, type conversions, struct compositions, and entity component extractions (`@collidor/struct`).
   - Group boundary IO: Inlined function arguments (`inputs.speed`) and return statements (`{ scaledSpeed }`).
   - Custom compiler plugins via `options.customCompilers`.
3. **Dead-Code Elimination**:
   - Backward-walk DAG reachability analysis prunes all unneeded upstream nodes not contributing to the designated target outputs.
4. **Studio Integration & Benchmarking**:
   - Added `⚡ Compile` action button to `<axon-studio>` toolbar with `axon-graph-compiled` event and clipboard export.
   - Added `benchmarkCompiled(graph, testInputs, iterations)` measuring ops/sec speedup between compiled functions and dynamic `BaseGraph.flush()`.
5. **Verification**:
   - 11/11 tests passing in `src/compiler/__tests__/graphCompiler.spec.ts`.
   - All 38 test suites (241 tests) passing across `@collidor/axon`.
   - Clean `tsc --noEmit` compilation.
