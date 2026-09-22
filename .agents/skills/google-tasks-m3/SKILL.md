---
name: google-tasks-m3
description: >-
  Guides autonomous agents in developing, extending, styling, and debugging the Google Tasks Desktop
  application according to Material Design 3 (M3) specifications, the official Google Tasks API v1,
  and modular decoupled architecture. Use this skill when modifying or creating UI components,
  services, state management, or desktop shell features in this project.
---

# 🛠️ Skill: Google Tasks & Material Design 3 Engineering

This skill provides step-by-step procedures, runbooks, and recipes for autonomous agents developing within the **Google Tasks Desktop** codebase.

---

## 📑 Workflows & Runbooks

### Workflow 1: End-to-End Feature Implementation

Follow this decoupled 4-step pipeline whenever adding a new capability (e.g. task tags, recurrence, priority sorting):

```
1. Contract ──► 2. Service Adapter ──► 3. Reactive Store ──► 4. M3 Presentation UI
```

#### Step 1: Define Contracts
Open [tasks.types.ts](file:///d:/Projects/Google%20Tasks/src/contracts/tasks.types.ts) and add immutable properties:
```typescript
export interface Task {
  readonly id: string;
  readonly listId: string;
  readonly title: string;
  // New property with readonly modifier
  readonly newFeature?: string;
  // ...
}
```

#### Step 2: Update Service Adapters
Add the method signature to [ITasksService.ts](file:///d:/Projects/Google%20Tasks/src/services/ITasksService.ts), then implement it in:
1. `GoogleTasksService.ts` (Official REST API call with `Result<T>` wrapper)
2. `MockTasksService.ts` (In-memory mock for offline tests)

```typescript
// In ITasksService.ts:
myFeatureAction(taskId: string, payload: any): Promise<Result<Task>>;

// In GoogleTasksService.ts:
async myFeatureAction(taskId: string, payload: any): Promise<Result<Task>> {
  const listId = this.taskToListMap.get(taskId);
  if (!listId) return failure('List not found for task');
  
  const res = await this.request<any>(`/lists/${listId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) return res;
  return success(this.normalizeTask(res.data, listId));
}
```

#### Step 3: Implement Optimistic State Update in Zustand
Open [useTaskStore.ts](file:///d:/Projects/Google%20Tasks/src/store/useTaskStore.ts):
```typescript
executeMyFeature: async (taskId: string, value: string) => {
  const originalTasks = get().tasks;
  
  // 1. Optimistic local mutation (0ms UI latency)
  set({
    tasks: originalTasks.map((t) =>
      t.id === taskId ? { ...t, newFeature: value } : t
    ),
  });

  // 2. Background service call
  const result = await get().service.myFeatureAction(taskId, { newFeature: value });

  // 3. Rollback on failure
  if (!result.ok) {
    set({ tasks: originalTasks });
    console.error('Feature update failed:', result.error);
  }
}
```

#### Step 4: Build / Update M3 Presentation Component
Bind the store state to a decoupled presentation view using M3 design tokens and state layers.

---

### Workflow 2: Building a Material Design 3 (M3) UI Component

When creating or modifying components in `src/components/ui/`:

1. **Select the Correct Surface Container**:
   * Canvas / Background: `bg-m3-surface`
   * Main Card / Container: `bg-m3-surface-container`
   * Modal / Dropdown / Dialog: `bg-m3-surface-container-high`
   * Input field / FAB: `bg-m3-surface-container-highest`
2. **Apply Semantic Color Pairs**:
   * Primary Button: `bg-m3-primary text-m3-on-primary`
   * Active Navigation: `bg-m3-primary-container text-m3-on-primary-container`
   * Subtitle / Secondary text: `text-m3-on-surface-variant`
   * Borders / Dividers: `border-m3-outline-variant`
3. **Include M3 State Layers**:
   * Hover: `hover:bg-m3-on-surface/10` or `hover:bg-m3-primary/10`
   * Active / Pressed: `active:bg-m3-on-surface/15`
   * Focus Ring: `focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none`
4. **Apply Shape Scale**:
   * `rounded-full` for buttons, chips, and nav items.
   * `rounded-m3-md` (12px) for inputs.
   * `rounded-m3-lg` (16px) for cards.
   * `rounded-m3-3xl` (28px) for dialogs (`M3Dialog`).

---

### Workflow 3: Google Tasks API v1 Operations

#### Ingesting & Reconstructing Subtasks
The Google Tasks API returns flat arrays where subtasks are identified by a `parent` ID string:
```typescript
// Reconstruct hierarchy
const subtasksMap = new Map<string, Subtask[]>();
rawItems.forEach((item) => {
  if (item.parent) {
    const list = subtasksMap.get(item.parent) || [];
    list.push({
      id: item.id,
      parentId: item.parent,
      title: item.title || '',
      completed: item.status === 'completed',
    });
    subtasksMap.set(item.parent, list);
  }
});
```

#### Reordering and Nesting Tasks
Use the `/move` endpoint:
* Move task after another: `POST /lists/{listId}/tasks/{taskId}/move?previous={targetId}`
* Nest task under parent: `POST /lists/{listId}/tasks/{taskId}/move?parent={parentId}`
* Promote to root: `POST /lists/{listId}/tasks/{taskId}/move` (no parent parameter)

---

### Workflow 4: Extending Electron Desktop Integration

When adding new desktop-native features (e.g. global shortcuts, system tray, file exports):

1. **Implement IPC Handler in `electron/main.ts`**:
   ```typescript
   ipcMain.handle('app:custom-action', async (_event, arg: string) => {
     // Electron main process logic
     return { success: true };
   });
   ```
2. **Expose in `electron/preload.cjs`**:
   ```javascript
   const api = {
     // ...
     customAction: (arg) => ipcRenderer.invoke('app:custom-action', arg),
   };
   ```
3. **Update TypeScript Typing in `src/vite-env.d.ts`**:
   ```typescript
   interface Window {
     electronAPI?: {
       // ...
       customAction: (arg: string) => Promise<{ success: boolean }>;
     };
   }
   ```
4. **Consume in React with Lifecycle Cleanup**:
   Ensure any event listeners registered via IPC return an unbind callback that is called inside `useEffect`'s cleanup return.

---

## 🔍 Validation & Verification Runbook

Before completing any task, execute this verification runbook:

1. **Verify TypeScript & Production Build**:
   ```powershell
   cmd.exe /c "npm run build"
   ```
   * Must exit with code 0.
   * Zero TypeScript compiler errors.
   * Both `dist/` and `dist-electron/` bundles must be emitted successfully.
2. **Review Invariant Checks**:
   - [ ] No `any` types added.
   - [ ] No hardcoded hex values in component templates.
   - [ ] Async service calls return `Result<T>`.
   - [ ] Event subscriptions have corresponding cleanup returns.
