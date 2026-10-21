# Type-Safe Edge Connections with Struct Subtyping

`wayfinder:task`

## Question

How should Axon validate edge connections at both runtime and canvas connection time using `@collidor/struct`'s subtyping and port contracts (`toAxonPort`, `isAssignable`, `getAxonDataType`)?

## Context

Currently, `BaseNode.isValid` only checks raw JavaScript constructor equality (`Number`, `String`, `Boolean`, `Array`). When dragging an edge in `<axon-graph>`, ports only perform basic compatibility checks.

`@collidor/struct` provides a rich AST subtyping bridge (`bridges/axon.ts`):
- `isAssignable(sourceDesc, targetDesc)`: Sound subtyping across primitives, arrays, records, unions, and tuples.
- Nullability & optionality: Prevents nullable/optional outputs from connecting to non-nullable inputs.
- Named structs & Odin capabilities: Matches struct names and compatibility.

## Plan & Decisions to Make

1. **Edge Drag Magnetic Snapping & Feedback**:
   - When a user begins dragging an edge from an output port, inspect all target input ports.
   - Use `isAssignable(sourceDescriptor, targetDescriptor)` to highlight valid candidate ports (green glow) and prevent dropping onto incompatible ports (red shake / rejection).
2. **Headless Graph Validation**:
   - In `BaseGraph.addEdge(sourceNodeId, sourcePort, targetNodeId, targetPort)`, validate that the port descriptors are assignable.
   - If invalid, reject the edge or return a descriptive `Result.err('Cannot connect output ... to input ...')`.
3. **Dynamic Port Descriptors**:
   - Standardize port definitions in `BaseNode` so that ports can carry either a constructor or a `@collidor/struct` `TypeDescriptor`.
