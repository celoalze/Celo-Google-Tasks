# 🤖 AI Agent & Contributor Engineering Guidelines

> **Target Audience**: Autonomous AI coding agents and human engineers contributing to **Google Tasks Desktop**.
> **Objective**: Ensure that any modification, extension, or refactor strictly adheres to the **Material Design 3 (M3)** specification, the **official Google Tasks API v1**, and clean, modular, decoupled architecture.

---

## 📑 Table of Contents
1. [Core Architectural Invariants](#1-core-architectural-invariants)
2. [Material Design 3 (M3) Implementation Standards](#2-material-design-3-m3-implementation-standards)
3. [Official Google Tasks API Integration](#3-official-google-tasks-api-integration)
4. [Component Design & Reusability Catalog](#4-component-design--reusability-catalog)
5. [State Management & Optimistic UI Patterns](#5-state-management--optimistic-ui-patterns)
6. [Desktop Integration & Electron IPC Security](#6-desktop-integration--electron-ipc-security)
7. [Code Hygiene & Agentic Readability Standards](#7-code-hygiene--agentic-readability-standards)

---

## 1. Core Architectural Invariants

All code in this repository MUST respect strict layer boundaries. High-level domain logic must never depend directly on presentation views, third-party network APIs, or Electron IPC details.

```
┌─────────────────────────────────────────────────────────────┐
│                   1. Contracts & Schemas                    │
│   src/contracts/tasks.types.ts  •  src/contracts/api.types.ts │
│          (Immutable types, domain models, Result<T>)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌─────────────────────────────┐         ┌─────────────────────────────┐
│    2. Core Domain Logic     │         │   3. Services & Adapters    │
│  src/core/smartFilters.ts   │         │  src/services/ITasksService │
│  src/core/dateUtils.ts      │         │  GoogleTasksService         │
│  src/core/notificationSched │         │  MockTasksService           │
│   (Pure functions, zero UI) │         │   (I/O, Network, Mapping)   │
└──────────────┬──────────────┘         └──────────────┬──────────────┘
               │                                       │
               └───────────────────┬───────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 4. Reactive State Management                │
│       src/store/useTaskStore.ts  •  src/store/useThemeStore  │
│      (Zustand store, optimistic updates, cache, actions)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    5. Presentation & UI                     │
│  src/components/ui/  •  src/components/tasks/  •  Sidebar    │
│         (Data-bound views, design tokens, M3 styling)        │
└─────────────────────────────────────────────────────────────┘
```

### Invariant Rules
1. **Never Import UI into Core/Services/Contracts**:
   - `src/contracts`, `src/core`, and `src/services` must NEVER import React, JSX, or Tailwind classes.
   - Core domain logic must consist of deterministic, pure functions with zero side effects.
2. **Explicit Error Handling via `Result<T>`**:
   - Never throw raw errors or swallow exceptions silently across service boundaries.
   - All async service operations must return `Promise<Result<T>>` using `success(data)` or `failure(errorMessage)`.
3. **Immutability by Default**:
   - Use `readonly` for all interface properties in `src/contracts`.
   - Prevent state mutations in place; always return new frozen or shallow-copied objects.
4. **Service Contract Inversion**:
   - The reactive store interacts strictly with `ITasksService`.
   - Concrete implementations (`GoogleTasksService`, `MockTasksService`) must fulfill this interface identically.

---

## 2. Material Design 3 (M3) Implementation Standards

The visual design system adheres strictly to the official [Material Design 3 (M3) Specification](https://m3.material.io/).

### 2.1 Tonal Surface Container Hierarchy
In M3, elevation is rendered primarily through **tonal surface containers**, NOT harsh drop shadows. Always select the container level matching the semantic hierarchy of the surface:

| Token / CSS Variable | Class Alias | Semantic Purpose in Google Tasks |
| :--- | :--- | :--- |
| `--md-sys-color-surface` | `bg-m3-surface` | The application base canvas, frameless titlebar background, and primary sidebar body. |
| `--md-sys-color-surface-dim` | `bg-m3-surface-dim` | Recessed areas and dimmed background states. |
| `--md-sys-color-surface-bright` | `bg-m3-surface-bright` | Elevated elements in dark mode, card highlight states. |
| `--md-sys-color-surface-container-lowest` | `bg-m3-surface-container-lowest` | Lowest background level in layered cards. |
| `--md-sys-color-surface-container-low` | `bg-m3-surface-container-low` | Secondary background regions, hover surfaces. |
| `--md-sys-color-surface-container` | `bg-m3-surface-container` | Main task view card body, default elevated container. |
| `--md-sys-color-surface-container-high` | `bg-m3-surface-container-high` | Modals, dialogs, popovers, context menus, and elevated sheets. |
| `--md-sys-color-surface-container-highest` | `bg-m3-surface-container-highest` | Floating action buttons (FABs), text input backgrounds, chips, and subtask rows. |

### 2.2 Color Roles & Semantics
Never hardcode hex values in component templates. Always use the registered M3 Tailwind classes:

* **Primary Accent**:
  - `bg-m3-primary` & `text-m3-on-primary`: Main CTA buttons, active checkbox fills, active indicator pills.
  - `bg-m3-primary-container` & `text-m3-on-primary-container`: Active sidebar navigation items, highlighted list pills.
* **On-Surface Content**:
  - `text-m3-on-surface`: Primary text titles, headings, active labels (High emphasis, 87-100%).
  - `text-m3-on-surface-variant`: Secondary notes, due dates, timestamps, list labels (Medium emphasis, 60-70%).
  - `text-m3-outline`: Dividers, subtle icons, placeholder text, borders.
  - `border-m3-outline-variant`: Subtle card and row separators.
* **Semantic Highlights**:
  - `text-m3-star` / `bg-m3-star`: Google Star highlight (#fcc408 in dark, #fbbc04 in light).
  - `text-m3-overdue`: Overdue task alerts (#f28b82 in dark, #b3261e in light).
  - `text-m3-success`: Completed state confirmation (#81c995 in dark, #1e8e3e in light).
  - `text-m3-important`: Priority highlights (#7fcfff in dark, #1a73e8 in light).

### 2.3 Shape & Corner Radii Scale
Follow M3 shape scales using configured tokens:
* `rounded-m3-xs` (`4px`): Badges, tiny tags, context menu items.
* `rounded-m3-sm` (`8px`): Small chips, tooltips.
* `rounded-m3-md` (`12px`): Input fields, subtask containers.
* `rounded-m3-lg` (`16px`): Cards, task list containers.
* `rounded-m3-xl` (`20px`): Floating cards, search bars.
* `rounded-m3-2xl` (`24px`): Main task cards, large sheet headers.
* `rounded-m3-3xl` (`28px`): Dialogs, modal sheets (`M3Dialog`).
* `rounded-full` (`9999px`): Standard M3 Buttons, Checkboxes, Nav Items, Icon Buttons.

### 2.4 State Layers & Interaction Feedback
M3 utilizes semi-transparent overlays on top of base container colors to represent interaction states:
* **Hover**: Add `hover:bg-m3-on-surface/10` or `hover:bg-m3-primary/10`.
* **Pressed / Active**: Add `active:bg-m3-on-surface/15` or `active:bg-m3-primary/20`.
* **Focus**: Maintain accessible outline ring: `focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none`.
* **Disabled**: `disabled:opacity-40 disabled:cursor-not-allowed`.

### 2.5 Typography & Google Sans
* **Font Family**: Google Sans is bundled offline in `src/assets/fonts/` with system fallbacks:
  `'Google Sans', 'Google Sans Text', 'Segoe UI', Roboto, sans-serif`.
* **Font Scaling**: The CSS variable `--font-scale` dynamically modifies root font sizing:
  `html { font-size: calc(16px * var(--font-scale, 1)); }`.
* **Icons**: [Google Material Symbols Rounded](https://fonts.google.com/icons) with standard `opsz: 24`, `wght: 400`. For filled states, apply the `.filled` class (`font-variation-settings: 'FILL' 1`).

---

## 3. Official Google Tasks API Integration

All network interaction with Google must comply with the [Google Tasks API v1](https://developers.google.com/tasks/reference/rest).

### 3.1 Data Schema Mapping

| Google API v1 Property | Local Contract (`Task`) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `string` | Unique task identifier generated by Google. |
| `title` | `title` | `string` | Task title (plain text). |
| `notes` | `notes` | `string` | Additional description / markdown notes. |
| `status` | `completed` | `boolean` | `'completed'` ⇄ `true`, `'needsAction'` ⇄ `false`. |
| `completed` | `completedAt` | `string (RFC 3339)` | Timestamp when completed. |
| `due` | `due` | `string (RFC 3339)` | Due date (RFC 3339 timestamp). In Google Tasks, date-only is midnight UTC. |
| `parent` | `subtasks[n].parentId` | `string` | Google returns subtasks as flat tasks with a `parent` field. |
| `position` | `position` | `string` | Lexicographical string denoting ordering. |
| `updated` | `updatedAt` | `string (RFC 3339)` | Last modification timestamp. |
| `links` | `links` | `readonly TaskLink[]` | Contextual links (e.g. email reference from Gmail). |
| `assignmentInfo` | `assignmentInfo` | `TaskAssignmentInfo` | Google Space / Drive assignment metadata. |

### 3.2 Handling Subtasks (Hierarchy Reconstruction)
> [!IMPORTANT]
> The Google Tasks API returns tasks and subtasks as a **flat list** within each tasklist. Subtasks are indicated strictly by the presence of a `parent` ID string pointing to another task's `id`.

When ingesting tasks via `GoogleTasksService.getTasks()`:
1. Iterate through raw items and separate parent tasks from items containing a `parent` property.
2. Group child items by their `parent` ID.
3. Attach children to the parent task's `subtasks` array (`Subtask[]`).
4. Keep the internal `taskToListMap` cache synchronized with all IDs (both parents and subtasks) so updates, moves, and deletions target the correct `listId`.

### 3.3 Task Positioning & Reordering
Google Tasks sorts items using lexicographical position strings (`position`).
* When reordering or re-parenting, invoke:
  `POST https://tasks.googleapis.com/tasks/v1/lists/{listId}/tasks/{taskId}/move`
  Query parameters:
  - `parent`: The new parent task ID (omit to move to root).
  - `previous`: The ID of the preceding task at the target position (omit to move to top).
* To promote a subtask to a top-level task:
  Invoke `move` with no `parent` parameter: `/lists/{listId}/tasks/{subtaskId}/move`.

### 3.4 Rate Limiting & Error Handling
* **Quota**: Standard Google Tasks API quota is 50,000 queries per day (~100 QPS per user).
* **Exponential Backoff**: If HTTP 429 (Too Many Requests) or HTTP 503 is returned, implement exponential backoff before retrying.
* **HTTP 401 Handling**: When an access token expires, request a new access token via Electron's OAuth refresh handler (`electronAPI.getGoogleSession()`) before re-submitting the failed request.

---

## 4. Component Design & Reusability Catalog

All reusable UI components live in `src/components/ui/` and must be maintained with clear prop interfaces and zero business logic dependencies.

### 4.1 Reusable UI Primitives
* **`M3Button`**:
  - Variants: `'text' | 'filled' | 'tonal' | 'elevated' | 'danger'`.
  - Sizes: `'sm' | 'md' | 'lg'`.
  - Shapes: `'pill' (rounded-full)` or `'rounded' (rounded-2xl)`.
  - Supports `icon` (leading or trailing) with automated sizing.
* **`M3IconButton`**:
  - Circular touch-target with centered Google Material Symbol.
  - Sizes: `'sm' (28px)`, `'md' (32px)`, `'lg' (40px)`.
  - Supports `active` and `filled` states with automatic color swapping.
* **`M3Checkbox`**:
  - Circular animated checkbox conforming to Google Tasks mobile & web specifications.
  - Smooth scale and stroke transition on toggle.
* **`M3Dialog`**:
  - Full-screen backdrop blur modal with M3 28px border radius.
  - Includes `Escape` keyboard trap, backdrop click dismissal, title bar, description, children slot, and action footer.
* **`M3Menu`**:
  - Floating contextual dropdown menu (`bg-m3-surface-container-high`) with M3 elevation shadows (`shadow-2xl`) and rounded corners.
* **`M3NavItem`**:
  - High-precision navigation row used in the sidebar.
  - Features active pill shape (`bg-m3-primary-container`), leading icon slot, counter badge, and optional trailing controls.
* **`M3TextField`**:
  - Material Design filled-style input with subtle bottom indicator border, floating label support, and error captioning.
* **`DateTimePickers`**:
  - Custom M3-styled date selector, quick preset chips (*Today*, *Tomorrow*, *Next Week*), and optional time picker.

### 4.2 Rules for Creating New Components
1. **Never hardcode component dimensions** unless implementing a fixed standard touch-target (e.g. `40px` M3 nav height, `48px` FAB).
2. **Prop interface must extend HTMLAttributes**: Always allow forwarding `className`, `style`, `aria-*`, and native HTML props.
3. **Keep Presentation Views Decoupled**: Pass callbacks (`onSave`, `onDelete`) rather than invoking store actions directly inside generic UI components.

---

## 5. State Management & Optimistic UI Patterns

The application uses **Zustand** (`src/store/useTaskStore.ts`) to manage state reactively.

### 5.1 Optimistic UI Updates
To ensure an instant, zero-latency desktop experience, all user interactions must update the local Zustand state **immediately**, then synchronize with the backend service asynchronously.

```typescript
// Standard Optimistic Update Pattern
toggleTaskCompletion: async (taskId: string) => {
  const originalTasks = get().tasks;
  const targetTask = originalTasks.find((t) => t.id === taskId);
  if (!targetTask) return;

  // 1. Apply optimistic update immediately
  set({
    tasks: originalTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ),
  });

  // 2. Perform background API call
  const result = await get().service.toggleTaskCompletion(taskId);

  // 3. Rollback on failure
  if (!result.ok) {
    set({ tasks: originalTasks });
    get().showErrorSnackbar(result.error);
  }
}
```

### 5.2 Store Hydration & Cache
* When the application boots, `init()` reads saved preferences (offline cache, last active list) and attempts session restoration.
* List and task data are cached locally to provide an immediate offline view before remote Google Tasks fetch completes.

---

## 6. Desktop Integration & Electron IPC Security

The desktop shell runs on **Electron** with security hardening.

### 6.1 Security Invariants
* `nodeIntegration` MUST remain `false`.
* `contextIsolation` MUST remain `true`.
* All communication from the frontend renderer to the Electron main process MUST pass through the strongly typed `window.electronAPI` exposed in `electron/preload.cjs`.

### 6.2 IPC Endpoints
* **Window Controls**: `minimizeWindow`, `maximizeWindow`, `closeWindow`, `isWindowMaximized`.
* **OAuth 2.0 PKCE**: `googleLogin(clientId, clientSecret)`, `getGoogleSession()`, `googleLogout()`.
* **Native Desktop Notifications**: `showNotification({ title, body, taskId })`.
* **Taskbar Overlay Badges**: `setBadge(pendingCount, dataUrl)` generates dynamic high-contrast pending count badges on Windows and macOS taskbars.
* **External Links**: `openExternal(url)` opens URLs securely in the user's default web browser.

---

## 7. Code Hygiene & Agentic Readability Standards

Any automated or manual commit must fulfill the following quality standards:

1. **Zero Dead Code**: No commented-out legacy blocks, unused imports, or orphaned utility functions.
2. **TypeScript Strict Mode**: No `any` types in contracts or domain logic. Use precise union types and type guards.
3. **Deterministic Returns**: Functions must have explicit return types (`Result<T>`, `boolean`, `void`).
4. **Lifecycle & Memory Management**:
   - Explicitly clean up all `addEventListener`, `setInterval`, `setTimeout`, and Electron event listeners in `useEffect` cleanup returns.
5. **Atomic Testing**: Verify any changes by running:
   ```powershell
   npm run build
   ```
   The build must succeed with zero TypeScript or Vite errors before marking any task as complete.
