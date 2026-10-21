# Node Inspector & Form Generation with @collidor/ui

`wayfinder:prototype`

## Question

How should the visual graph editor expose a reactive node property inspector that automatically renders configuration forms from node `@collidor/struct` schemas using `<struct-form>` from `@collidor/ui`?

## Context

`@collidor/ui` provides a rich `<struct-form>` Web Component that takes a `@collidor/struct` schema and renders inputs, sliders, select dropdowns, and validation error messages adhering to OKLCH color and Golden Ratio spacing design tokens.

Many Axon nodes have structured configuration:
- `math.node`: operation (`ADD`, `SUB`, `MUL`, `DIV`), operands.
- `clock.node`: frequency, interval, enabled state.
- `composeStruct.node`: fields, default values.
- `commandDispatch.node`: commandName, payload schema.
- `sqliteTable.node`: table name, query parameters.

## Plan & Decisions to Make

1. **Selection & Active Node Context**:
   - When a node box is selected (or double-clicked), the inspector sidebar or drawer receives the node's engine instance and schema.
2. **Dynamic Form Binding**:
   - Render `<struct-form>` with `node.data` bound two-way.
   - When form values change, dispatch `UpdateNodeDataCommand` through the transaction/command pipeline so the change is undoable (`Ctrl+Z`).
3. **Fallback Inspector**:
   - For nodes without an explicit struct schema, provide a standard property table based on `node.data`.
