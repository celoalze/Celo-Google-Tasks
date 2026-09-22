# 🤖 AI Agent & Contributor Guidelines

The primary authoritative guidelines for autonomous AI coding agents and human engineers are maintained at the repository root in [AGENT_GUIDELINES.md](../AGENT_GUIDELINES.md).

---

## ⚡ Quick Reference Checklist

Before submitting changes or completing coding tasks, verify the following:

- [ ] **Material Design 3 (M3)**:
  - All surface containers use semantic tokens (`surface-container-lowest` to `highest`), not hardcoded hex values or arbitrary drop shadows.
  - Interactive states utilize M3 state layer overlays (`hover:bg-m3-on-surface/10`, `focus-visible:ring-2`, etc.).
  - Shapes conform to M3 corner radius scale (`rounded-m3-md`, `rounded-m3-lg`, `rounded-m3-3xl`, `rounded-full`).
- [ ] **Official Google Tasks API v1**:
  - Subtasks are reconstructed from Google's flat task list using the `parent` property.
  - Reordering and re-parenting use the official `/move` API with `parent` and `previous` parameters.
  - Cross-list task movements follow the copy-create-delete transaction pattern.
- [ ] **Modular & Decoupled Architecture**:
  - Strict layer boundaries maintained: Contracts ➔ Core Logic ➔ Services/Adapters ➔ Store ➔ Presentation UI.
  - Pure domain functions have zero React or JSX dependencies.
  - All async operations return explicit `Result<T>` (`success` or `failure`).
- [ ] **Performance & State**:
  - Optimistic UI updates are applied immediately in Zustand, with rollback on service failure.
- [ ] **Hygiene & Verification**:
  - Zero dead code, zero commented-out legacy blocks.
  - Strict TypeScript types with no `any`.
  - The repository builds cleanly with zero errors: `npm run build`.

For full specifications and detailed code examples, refer directly to [AGENT_GUIDELINES.md](../AGENT_GUIDELINES.md).
