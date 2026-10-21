# Design Tokens & Component Parity with @collidor/ui

`wayfinder:task`

## Question

How do we completely align Axon's styling (`axon.css`, node card styles, port styles) with `@collidor/ui` design tokens (Golden Ratio spacing, OKLCH jewel colors, typography) and replace ad-hoc HTML controls with `@collidor/ui` components?

## Context

Axon recently adopted partial design tokens, but several legacy styles remain:
- Hardcoded dark hex values (`#1c2024`, `#3a3832`, `#fff4dd`, `#090d16`).
- Standard HTML `<select>`, `<button>`, `<input>` embedded into `actionNodes.component.ts`, `dataGraphNodes.component.ts`, and `clockNode.component.ts`.
- Inconsistent border radii and box shadows.

## Plan & Decisions to Make

1. **Token Migration**:
   - Audit `src/web-components/axon.css` and replace all raw hex colors with `--ui-color-*` and `--ui-jewel-*` tokens.
   - Replace arbitrary margins/paddings with Golden Ratio tokens (`--ui-space-xs`, `--ui-space-sm`, `--ui-space-md`, etc.).
2. **Component Parity**:
   - Replace raw `<select>` elements with `<ui-select>`.
   - Replace raw checkboxes with `<ui-switch>`.
   - Replace buttons with `<ui-button>`.
   - Wrap node headers and cards using `<ui-card>` or unified card styling with `--ui-radius-*` and `--ui-shadow-*`.
3. **Theme Consistency**:
   - Ensure the canvas looks crisp in both dark mode and light mode based on `@collidor/ui` theme surface tokens.
