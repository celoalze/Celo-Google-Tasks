# 🏛️ System Architecture

**Google Tasks Desktop** is built using a strictly modular, decoupled, and offline-capable architecture. The application separates domain definitions, business logic, I/O adapters, state management, and UI presentation into clean, isolated layers.

---

## 📐 Layer Separation Overview

```
                                  Renderer (React 19)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  [Presentation Views & UI]                                                             │
│  src/components/                                                                        │
│   ├── chrome/      (Frameless TitleBar, Window controls)                                │
│   ├── navigation/  (Sidebar, user profile, smart filter badges, custom lists)           │
│   ├── tasks/       (Main task view, groups, task card, quick creation, task details)    │
│   ├── settings/    (OAuth configuration modal, theme toggles)                           │
│   └── ui/          (M3Button, M3Checkbox, M3Dialog, M3NavItem, M3TextField, etc.)       │
│                                      │                                                  │
│                                      ▼                                                  │
│  [Reactive State Management]                                                            │
│  src/store/                                                                             │
│   ├── useTaskStore.ts   (Optimistic task/list mutations, offline cache, selection state) │
│   └── useThemeStore.ts  (Dark/light mode, font scaling, M3 CSS variable injection)       │
│               │                                              │                          │
│               ▼                                              ▼                          │
│  [Core Domain Logic]                           [Services & Adapters]                    │
│  src/core/                                     src/services/                            │
│   ├── smartFilters.ts   (Pure filter queries)    ├── ITasksService.ts (Contract)        │
│   ├── dateUtils.ts      (RFC 3339 parsing)       ├── GoogleTasksService.ts (REST API)   │
│   ├── notificationSched (Reminder triggers)      └── MockTasksService.ts (Local testing)│
│   └── badgeGenerator.ts (Taskbar badge canvas)                                          │
│               │                                              │                          │
│               └──────────────────────┬───────────────────────┘                          │
│                                      ▼                                                  │
│  [Contracts & Schemas]                                                                  │
│  src/contracts/                                                                         │
│   ├── tasks.types.ts  (Task, Subtask, TaskList, SmartFilterType)                        │
│   ├── api.types.ts    (Result<T>, success, failure)                                     │
│   └── theme.types.ts  (ThemeColors, ThemeMode, FontSizeLevel)                           │
│                                                                                         │
└──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                       │ IPC Bridge (contextBridge / preload.cjs)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [Electron Desktop Shell]                                                               │
│  electron/                                                                              │
│   ├── main.ts              (Frameless window, taskbar overlay, tray, protocol handling) │
│   ├── preload.cjs          (Hardened contextBridge exposing window.electronAPI)         │
│   └── auth/googleAuth.ts   (OAuth 2.0 PKCE loopback server, secure token persistence)   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Contracts & Schemas (`src/contracts/`)

The contract layer defines the data structures and interface signatures shared across the application.

* **Strict Immutability**: All contract fields are marked `readonly`.
* **Zero Dependencies**: Contracts never import external libraries, React components, or styling utilities.
* **Domain Models (`tasks.types.ts`)**:
  - `Task`: Reflects Google Tasks API v1 task resource, enriched with nested `Subtask[]`, RFC 3339 `due` timestamps, and priority tags.
  - `TaskList`: Represents a user task list container.
  - `SmartFilterType`: Enum for virtual lists (`'all'`, `'starred'`, `'today'`, `'tomorrow'`, `'overdue'`, `'completed'`).
* **Explicit Error Contracts (`api.types.ts`)**:
  ```typescript
  export type Result<T> =
    | { readonly ok: true; readonly data: T }
    | { readonly ok: false; readonly error: string };
  ```

---

## 2. Core Domain Logic (`src/core/`)

Core domain functions contain pure algorithms, date calculations, and scheduling logic.

* **Smart Filters (`smartFilters.ts`)**:
  Computes virtual groupings (*Today*, *Starred*, *Overdue*, *Completed*) purely based on date math and task status.
* **Date Utilities (`dateUtils.ts`)**:
  Deterministic RFC 3339 string manipulation, relative date formatting (*Today*, *Yesterday*, *Tomorrow*), and overdue detection.
* **Taskbar Badge Generator (`badgeGenerator.ts`)**:
  Uses an offscreen HTML `<canvas>` to render a high-contrast circular badge displaying the active pending task count, converted to an icon data URL for the Windows taskbar overlay.
* **Notification Scheduler (`notificationScheduler.ts`)**:
  Runs interval-based checks for tasks due in the upcoming minutes, firing native Electron notifications with interactive Snooze (15m) and Complete actions.

---

## 3. Services & I/O Adapters (`src/services/`)

All network communication and external persistence are encapsulated behind interfaces:

### `ITasksService` Contract
```typescript
export interface ITasksService {
  getUserProfile(): Promise<Result<UserProfile>>;
  getLists(): Promise<Result<TaskList[]>>;
  createList(title: string): Promise<Result<TaskList>>;
  renameList(listId: string, title: string): Promise<Result<TaskList>>;
  deleteList(listId: string): Promise<Result<void>>;
  getTasks(): Promise<Result<Task[]>>;
  createTask(params: { listId: string; title: string; due?: string; notes?: string }): Promise<Result<Task>>;
  updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'subtasks'>>): Promise<Result<Task>>;
  moveTaskToList(taskId: string, targetListId: string): Promise<Result<Task>>;
  deleteTask(taskId: string): Promise<Result<void>>;
  clearCompletedTasks(listId: string): Promise<Result<void>>;
  toggleTaskCompletion(taskId: string): Promise<Result<Task>>;
  moveTaskPosition(listId: string, taskId: string, options: { parent?: string; previous?: string }): Promise<Result<Task>>;
  addSubtask(taskId: string, title: string): Promise<Result<Task>>;
  toggleSubtaskCompletion(taskId: string, subtaskId: string): Promise<Result<Task>>;
  deleteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>>;
  promoteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>>;
}
```

* **`GoogleTasksService`**: Implements direct REST calls to `https://tasks.googleapis.com/tasks/v1` using OAuth Bearer tokens. Reconstructs parent-child subtasks from flat API responses and manages internal `taskToListMap` caching.
* **`MockTasksService`**: Offline mock implementation using in-memory demo data, enabling testing and development without requiring Google Cloud credentials.

---

## 4. Reactive State Management (`src/store/`)

State is managed via [Zustand](https://github.com/pmndrs/zustand).

### Optimistic UI Updates
User actions trigger instant state mutations locally before initiating background network calls. If the service returns an error, state is seamlessly rolled back to its previous snapshot and an error snackbar is displayed:

```
User Action (e.g. Check Task)
       │
       ▼
1. Update Local Zustand State Instantly  ──► UI Rerenders Instantly (0ms latency)
       │
       ▼
2. Asynchronous API Call to Google Tasks
       │
   ┌───┴───────────────┐
   ▼                   ▼
Success              Failure
(State confirmed)   (Rollback to snapshot & show error toast)
```

---

## 5. Desktop Shell & Electron Security Bridge

The desktop application runs on Electron 34 with standard security best practices:

* **Context Isolation**: `contextIsolation: true` prevents untrusted scripts from accessing Node.js primitives.
* **Zero Node Integration**: `nodeIntegration: false` in all renderer windows.
* **Preload Script Bridge (`preload.cjs`)**:
  Exposes a typed, minimal `window.electronAPI` bridge:
  - Window minimize, maximize, restore, close.
  - Native OAuth 2.0 PKCE authentication flow via local loopback HTTP server (`http://127.0.0.1:port`).
  - Desktop notifications with Windows Action Center action button support.
  - Dynamic taskbar overlay icons on Windows (`win.setOverlayIcon`).

---

## 6. Lifecycle & Memory Hygiene

* **Subscription Teardown**: All listeners registered with `window.electronAPI.onNotificationClicked` or `window.electronAPI.onNotificationAction` return explicit cleanup callbacks that must be executed during `useEffect` unmount.
* **Timer Teardown**: The notification scheduler interval is bound to an explicit `stopScheduler()` method.
* **Cache Management**: Local state cache keys are namespaced and updated atomically to prevent data corruption.
