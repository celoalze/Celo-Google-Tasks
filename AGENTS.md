# 🏛️ Workspace Rules for AI Agents: Google Tasks Desktop

> **Scope**: Repository-wide workspace rules.
> **Applies to**: Autonomous coding agents, subagents, and automated developer tools operating in this codebase.

---

## 1. Architectural Invariants & Layer Boundaries

The codebase follows a strictly decoupled, modular architecture. Agents must preserve these layer boundaries without exception:

1. **Contracts & Schemas (`src/contracts/`)**:
   - Single source of truth for types, domain models, and API interfaces.
   - All fields must be immutable (`readonly`).
   - Zero dependencies on React, Tailwind, DOM, or Electron.
2. **Core Domain Logic (`src/core/`)**:
   - Pure domain calculations (smart filter queries, date parsing, taskbar badge rendering, reminder scheduling).
   - Deterministic and free of presentation logic.
3. **Services & Adapters (`src/services/`)**:
   - All I/O and network requests are hidden behind the `ITasksService` contract.
   - Every async method must return `Promise<Result<T>>` (`{ ok: true, data: T }` or `{ ok: false, error: string }`). Never throw unhandled exceptions.
4. **Reactive State (`src/store/`)**:
   - Zustand stores manage application state.
   - Implement **optimistic updates**: mutate state immediately in the store, invoke the service in the background, and roll back state if the service returns `{ ok: false }`.
5. **Presentation & UI (`src/components/`)**:
   - Presentation components must be decoupled from concrete network implementations.
   - Generic UI components in `src/components/ui/` must remain reusable and headless/presentation-only with zero store bindings.

---

## 2. Material Design 3 (M3) Invariants

When creating or modifying any UI element, agents must strictly comply with the [Material Design 3 (M3)](https://m3.material.io/) specification:

* **Tonal Surface Elevation**:
  - Never use arbitrary drop shadows or generic background grays.
  - Use M3 surface container tokens:
    - Base canvas / titlebar / sidebar: `bg-m3-surface`
    - Main task list card body: `bg-m3-surface-container`
    - High-elevation cards / modals / dialogs: `bg-m3-surface-container-high`
    - Input fields / subtask rows / FABs: `bg-m3-surface-container-highest`
* **Color Roles**:
  - Always use paired tokens: `bg-m3-primary` with `text-m3-on-primary`, `bg-m3-primary-container` with `text-m3-on-primary-container`.
  - For semantic accents, use `text-m3-star`, `text-m3-overdue`, `text-m3-success`, and `text-m3-important`.
* **Shape Scales**:
  - Use configured radii: `rounded-m3-xs` (4px), `rounded-m3-sm` (8px), `rounded-m3-md` (12px), `rounded-m3-lg` (16px), `rounded-m3-2xl` (24px), `rounded-m3-3xl` (28px), and `rounded-full` for buttons, nav items, and checkboxes.
* **State Layers**:
  - Provide interactive visual feedback using opacity layers: `hover:bg-m3-on-surface/10`, `active:bg-m3-on-surface/15`, `focus-visible:ring-2 focus-visible:ring-m3-primary`.
* **Typography & Icons**:
  - Use the offline bundled `Google Sans` font family.
  - Respect the `--font-scale` token.
  - Use [Google Material Symbols Rounded](https://fonts.google.com/icons) with standard `opsz: 24`, `wght: 400` (or `.filled` when active).

---

## 3. Google Tasks API v1 Invariants

When interacting with tasks or modifying `GoogleTasksService`:

* **Subtasks Reconstruction**:
  - The Google Tasks API returns tasks as a **flat array**.
  - Subtasks are identified solely by their `parent` field pointing to a root task's `id`.
  - Always group child items into the parent's `subtasks` array (`Subtask[]`) before exposing them to the store.
* **Ordering & Position**:
  - Google Tasks sorts items with lexicographical position strings (`position`).
  - Use the `/move` endpoint with query parameters `?parent={id}` and `?previous={id}` to reorder or re-parent.
* **Cross-List Moves**:
  - Google Tasks does not support moving tasks directly across lists. Perform an atomic transaction: create in target list ➔ mark completion status ➔ delete from source list.
* **Dates & Timestamps**:
  - Store due dates in RFC 3339 format. Google Tasks normalizes date-only tasks to midnight UTC (`00:00:00.000Z`).

---

## 4. Desktop Security & Electron IPC Rules

* **Security Boundaries**:
  - `contextIsolation` must always be `true`.
  - `nodeIntegration` must always be `false`.
  - No direct Node.js imports (`fs`, `child_process`, `electron`) in `src/`.
* **IPC Communication**:
  - Use only the strongly-typed `window.electronAPI` interface exposed via `electron/preload.cjs`.
  - Always clean up event listeners returned by `onNotificationClicked` and `onNotificationAction` in component unmounts.

---

## 5. Code Hygiene & Quality Standards

* **Zero Dead Code**: Never commit commented-out legacy code blocks or unused imports.
* **Strict Typing**: No `any` types in contracts, services, or core utilities.
* **Pre-Completion Build Check**:
  - Before declaring any task complete, always verify the build passes with zero errors:
    ```powershell
    cmd.exe /c "npm run build"
    ```
