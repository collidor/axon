# Ticket 036 – Register Output Ports in AxonPort Component

**Goal**: Ensure `axonPort.component.ts` registers both input **and** output ports correctly.

- Remove the current guard `if (this.tagName.includes('IN'))` that skips output ports.
- Implement a unified registration flow that uses the port metadata from `BaseGraph` to determine direction.
- Update any related type definitions (`PortDirection`) and ensure the UI reflects output ports (e.g., proper connectors).
- Add unit tests under `src/__tests__/axonPort-output-registration.test.ts` asserting that output ports appear in the component's port list.
- Verify that existing input port functionality remains unchanged.

**Acceptance Criteria**
1. Output ports are instantiated and displayed in the UI.
2. No regression for input ports.
3. Tests pass.
4. Documentation in `src/web-components/README.md` updated to describe the new behavior.
