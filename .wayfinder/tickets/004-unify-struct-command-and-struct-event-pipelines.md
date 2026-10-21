# Unify Struct-Command and Struct-Event Pipelines

`wayfinder:task`

## Question

How should Axon deeply integrate `@collidor/struct-command` and `@collidor/struct-event` into `commandDispatch`, `commandHandler`, and `event` nodes, including Odin-style component requirements?

## Context

We recently created and updated `@collidor/struct-command` and `@collidor/struct-event` with Odin-style component requirements:
- `createStructCommand(name, requires(Position), outputSchema)`: Accepts any entity carrying `position` / `Position`.
- `createStructEvent(name, requires(Health), payloadSchema)`: Emits / listens with component validation.
- Commands and events enforce schema validation on instantiation and execution.

In Axon:
- `commandDispatch.node.ts` and `commandHandler.node.ts` should recognize `StructCommand` instances and automatically extract input port schemas and output return schemas.
- `event.node.ts` should recognize `StructEvent` instances and support both emitting and listening with full component requirement verification.

## Plan & Decisions to Make

1. **Schema Extraction**:
   - Update `deriveCommandDispatchPortSchemas` and `deriveCommandHandlerPortSchemas` to check `cmdDef.commandClass.schema` (or `cmdDef.commandClass.inputSchema`).
   - If input is a component requirement (`requires(Position)`), map ports to the required component's fields and provide an `entity` wildcard port.
2. **Component Injection at Dispatch**:
   - When an entity object is fed into `commandDispatch`, pass it directly to `new commandClass(entity)`. If using `requires(...)`, `StructCommand` automatically extracts the component cleanly.
3. **Event Node Unification**:
   - Update `event.node.ts` to support `StructEvent` instances from `@collidor/struct-event`.

## Status: Completed & Verified

- Auto-derivation and port synthesis for Odin component requirements (`requires(Position)`) across commands and events.
- Single and multi-component requirement unrolling with prefixing and individual field ports.
- Shared requirement symbol recognition (`isAnyComponentRequirement`) and seamless cross-package interop between `@collidor/struct-command` and `@collidor/struct-event`.
- Direct invocation and listener routing on `@collidor/command` and `@collidor/toolkit` `EventBus`.
- Comprehensive test coverage in `structCommandNodes.spec.ts` (7 passing), `commandNodes.spec.ts` (6 passing), `event.node.spec.ts` (6 passing).
- Zero TypeScript compile errors (`tsc --noEmit` exit code 0).
