# Ticket 037 – Remove Legacy AxonInspector Component

**Goal**: Eliminate the obsolete `AxonInspector` UI component and all related code.

- Delete `src/web-components/axonInspector.component.ts` and any associated styles/templates.
- Remove its exports from `src/web-components/index.ts` and any barrel files.
- Search the codebase for imports/references to `AxonInspector` (e.g., sidebars, demo pages) and delete or replace them.
- Update any documentation that mentions the inspector.
- Ensure the build still succeeds and existing tests pass.

**Acceptance Criteria**
1. No `AxonInspector` source files remain.
2. No compile‑time errors due to missing imports.
3. UI no longer shows an inspector sidebar.
4. Tests pass.
