# Ticket 035 – Refactor BaseGraph Port Metadata

**Goal**: Replace hard‑coded port names (`audioIn`, `events`, etc.) with a flexible metadata system.

- Introduce a `PortMetadata` interface describing name, direction (`in`/`out`), type, and flags (e.g., `multiInput`).
- Update `BaseGraph` to store ports via this metadata instead of string literals.
- Adjust all node implementations to register ports using the new metadata.
- Add unit tests ensuring ports are correctly created and retrievable.
- Update documentation in `README.md` about the new port system.

**Acceptance Criteria**
1. No hard‑coded port strings remain in `BaseGraph`.
2. Existing graph behavior is unchanged.
3. Tests pass.
