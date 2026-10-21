# Ticket 021: Clean Up Strudel Mini-Notation String Parser and Related Fields

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocks**: None

---

## Question

How do we remove all Strudel string parsing, mini-notation tokenizers, and mini-notation node references from the Axon source code and demo app while keeping the underlying functional event graph clean?

---

## Scope & Changes

1. **Delete**:
   - `src/nodes/audio/pattern/miniParser.ts`
   - `src/nodes/audio/pattern/__tests__/miniParser.spec.ts`
   - `src/nodes/audio/miniNotation.engine.ts`
   - `src/web-components/nodes/audio/miniNotationNode.component.ts`
2. **Update**:
   - `src/nodes/audio/index.ts`: Remove exports of `miniParser` and `miniNotation.engine`.
   - `src/nodes/audio/audioNodes.constants.ts`: Remove `MINI_NOTATION: 'mini-notation'`.
   - `src/web-components/constants.ts`: Remove `AXON_MINI_NOTATION_NODE` and remove from `BOX_SELECTOR`.
   - `src/web-components/nodes/audio/index.ts`: Remove `miniNotationNode.component` export.
   - `src/nodes/nodeLibrary.ts`: Remove registration of `MINI_NOTATION` in core and web components.
   - `src/web-components/axonStudio.component.ts`: Remove `mini-notation` palette item and replace strudel preset with pure node networks.
   - `demo/src/components/DocViewer.vue`: Replace mini-notation string parser references with pure Node Sequencer / Parallel graph descriptions.
   - `demo/src/components/Sidebar.vue`: Update sidebar item title from "Mini-Notation & Patterns" to "Node Sequencing & Patterns".
   - `demo/src/components/NodeGalleryView.vue`: Remove or replace mini-notation sandbox.
   - `demo/src/presets.ts`: Update presets to use Sequence/Parallel nodes instead of mini-notation.
