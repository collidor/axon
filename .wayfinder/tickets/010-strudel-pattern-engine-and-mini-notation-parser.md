# Ticket 010: Strudel Pattern Engine & Mini-Notation Parser

**Labels**: `wayfinder:task`
**Status**: Closed (Resolved)
**Resolution**: Implemented `Pattern<T>` combinators (fast, slow, rev, late, degrade, map, pure, silence, sequence, stack, alternate, euclidean, bjorklund) in `src/nodes/audio/pattern/pattern.ts`. Implemented mini-notation lexer and parser supporting sequences, subdivisions, rests, multipliers, alternations, euclideans, and polyphony in `src/nodes/audio/pattern/miniParser.ts`. Implemented `MiniNotationNodeEngine` / `createMiniNotationNode` converting haps to `AudioEvent[]` in `src/nodes/audio/miniNotation.engine.ts`. Registered in `nodeLibrary.ts`. 12 unit tests passing in `src/nodes/audio/pattern/__tests__/miniParser.spec.ts`.
**Blocked by**: Ticket 009
**Blocks**: Ticket 014

---

## Question

How do we build a native, zero-dependency Tidal/Strudel-style cyclic pattern evaluator and mini-notation parser in Axon that queries continuous time arcs and outputs structured `AudioEvent` arrays?

---

## Requirements

1. **Pattern Representation & Core Combinators (`src/nodes/audio/pattern/`)**:
   - `Pattern<T>`: Class representing a functional pattern over time with method `queryArc(begin: number, end: number): Hap<T>[]`.
   - `Hap<T>`: `{ whole: [number, number], part: [number, number], value: T }`.
   - Transformations:
     - `.fast(factor)` / `.slow(factor)`: Accelerates or decelerates cycle speed.
     - `.rev()`: Reverses the pattern within each cycle.
     - `.degrade(probability)`: Randomly drops haps based on probability.
     - `.late(offset)`: Time shifts events forward/backward in the cycle.

2. **Mini-Notation Lexer & Parser (`src/nodes/audio/pattern/miniParser.ts`)**:
   - Parses concise Strudel mini-notation syntax into a composite Pattern:
     - **Sequence**: `"c3 e3 g3 b3"` $\rightarrow$ 4 equal steps per cycle.
     - **Subdivisions**: `"c3 [e3 g3]"` $\rightarrow$ `e3 g3` split into half-step.
     - **Rests**: `"~"` $\rightarrow$ empty silence in that subdivision slot.
     - **Multipliers**: `"hh*4"` $\rightarrow$ repeat 4 times in slot; `"cp/2"` $\rightarrow$ slow down by 2.
     - **Alternating Cycles**: `"<c3 e3 g3>"` $\rightarrow$ step through alternate values each cycle.
     - **Euclidean Rhythms**: `"bd(3,8)"` $\rightarrow$ Bjorklund Euclidean distribution algorithm (3 hits across 8 steps).
     - **Polyphony / Stacks**: `"[c3, e3, g3]"` $\rightarrow$ simultaneous chord layers.

3. **`MiniNotationNodeEngine` (`src/nodes/audio/miniNotation.engine.ts`)**:
   - Node inputs:
     - `pattern`: string (e.g., `"c3 [e3 g3] <a2 b2>"` or `"bd sd [~ cp] [hh*4]"`)
     - `cycle`: number (current cycle from AudioClock)
     - `phase`: number (current phase `0..1`)
     - `cps`: number (tempo rate)
     - `velocity`: number (default: 0.8)
     - `params`: object (custom parameters passed to synth/sampler)
   - Node outputs:
     - `events`: `AudioEvent[]` (scheduled notes within upcoming arc)
     - `activeHap`: `AudioEvent` (immediate active event for visual flashing)
     - `stepIndex`: number (current step index within the cycle)

4. **Testing**:
   - Unit tests for mini-notation parsing and arc queries in `src/nodes/audio/pattern/__tests__/miniParser.spec.ts`.
