import { create } from 'zustand';
import { Task, TaskList, UserProfile, SmartFilterType } from '../contracts/tasks.types';
import { ITasksService } from '../services/ITasksService';
import { MockTasksService } from '../services/MockTasksService';
import { GoogleTasksService } from '../services/GoogleTasksService';
import { extractTimeFromText, syncTimeToNotes } from '../core/dateUtils';

export type SortOption = 'my_order' | 'date' | 'deadline' | 'starred' | 'title';

interface TaskState {
  tasks: Task[];
  lists: TaskList[];
  user: UserProfile;
  activeFilter: SmartFilterType | string;
  selectedTaskId: string | null;
  draggedTaskId: string | null;
  searchQuery: string;
  showCompleted: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  isSettingsOpen: boolean;
  isGoogleConnected: boolean;

  // Modal Dialog States (Google Tasks Official)
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  modalTargetListId: string | null;

  // Sorting & Multi-List Grid Visibility (Google Tasks Web)
  listSort: Record<string, SortOption>;
  visibleListIds: string[];
  toggleListVisibility: (listId: string) => void;
  setAllListsVisible: () => void;

  // Actions
  init: () => Promise<void>;
  syncTasks: (options?: { silent?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  connectGoogle: (clientId: string, clientSecret?: string) => Promise<{ ok: boolean; error?: string }>;
  disconnectGoogle: () => Promise<void>;

  setActiveFilter: (filter: SmartFilterType | string) => void;
  setSelectedTaskId: (id: string | null) => void;
  setDraggedTaskId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setShowCompleted: (show: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;

  openCreateTaskModal: (initialListId?: string) => void;
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;
  saveTaskFromModal: (params: {
    id?: string;
    listId: string;
    title: string;
    due?: string;
    time?: string;
    notes?: string;
  }) => Promise<void>;

  toggleTaskStar: (taskId: string) => void;
  setListSort: (listId: string, sort: SortOption) => void;

  toggleTaskCompletion: (taskId: string) => Promise<void>;
  createTask: (title: string, customListId?: string, due?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'subtasks'>>) => Promise<void>;
  moveTaskToList: (taskId: string, targetListId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  clearCompletedTasks: (listId: string) => Promise<void>;
  reorderTask: (
    taskId: string,
    targetPreviousTaskId: string | null,
    destinationListId?: string
  ) => Promise<void>;

  createList: (title: string) => Promise<TaskList | null>;
  renameList: (listId: string, title: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  reorderList: (sourceListId: string, targetListId: string) => void;

  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtaskCompletion: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  promoteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}

// Concurrency & Mutex tracking for rapid user interactions
const pendingTaskActionIds = new Set<string>();

// Local persistence helpers for Google Tasks visual features
function getStoredStarred(): Set<string> {
  try {
    const val = localStorage.getItem('google_tasks_starred');
    return val ? new Set(JSON.parse(val)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredStarred(ids: Set<string>) {
  try {
    localStorage.setItem('google_tasks_starred', JSON.stringify(Array.from(ids)));
  } catch {}
}

function getStoredTimes(): Record<string, string> {
  try {
    const val = localStorage.getItem('google_tasks_times');
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

function saveStoredTimes(times: Record<string, string>) {
  try {
    localStorage.setItem('google_tasks_times', JSON.stringify(times));
  } catch {}
}

function getStoredVisibleLists(): string[] | null {
  try {
    const val = localStorage.getItem('google_tasks_visible_lists');
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function saveStoredVisibleLists(ids: string[]) {
  try {
    localStorage.setItem('google_tasks_visible_lists', JSON.stringify(ids));
  } catch {}
}

function getStoredListOrder(): string[] | null {
  try {
    const val = localStorage.getItem('google_tasks_lists_order');
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function saveStoredListOrder(ids: string[]) {
  try {
    localStorage.setItem('google_tasks_lists_order', JSON.stringify(ids));
  } catch {}
}

function applyListOrder(lists: TaskList[], order: string[] | null): TaskList[] {
  if (!order || order.length === 0) return lists;
  const orderMap = new Map<string, number>();
  order.forEach((id, index) => orderMap.set(id, index));

  return [...lists].sort((a, b) => {
    const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    return idxA - idxB;
  });
}

let currentService: ITasksService = new MockTasksService();

export function createTasksService(accessToken?: string): ITasksService {
  if (accessToken) return new GoogleTasksService({ accessToken });
  return new MockTasksService();
}

export function setTasksService(service: ITasksService): void {
  currentService = service;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  lists: [],
  user: {
    displayName: 'Conta Google',
    email: 'Faça login para sincronizar',
    photoUrl: '',
    isAuthenticated: false,
  },
  activeFilter: 'all',
  selectedTaskId: null,
  draggedTaskId: null,
  searchQuery: '',
  showCompleted: false,
  isLoading: true,
  isSyncing: false,
  lastSyncedAt: null,
  isSettingsOpen: false,
  isGoogleConnected: false,

  isTaskModalOpen: false,
  editingTask: null,
  modalTargetListId: null,
  listSort: {},
  visibleListIds: [],

  init: async () => {
    set({ isLoading: true });

    // Check if there is an existing authenticated Google session
    try {
      const session = await window.electronAPI?.getGoogleSession();
      if (session?.ok && session.data?.accessToken) {
        currentService = createTasksService(session.data.accessToken);
        set({ isGoogleConnected: true });
      } else {
        currentService = createTasksService();
        set({ isGoogleConnected: false });
      }
    } catch {
      currentService = createTasksService();
      set({ isGoogleConnected: false });
    }

    if (!get().isGoogleConnected) {
      set({
        lists: [],
        tasks: [],
        isLoading: false,
      });
      return;
    }

    await get().syncTasks({ silent: false });
  },

  syncTasks: async (options = { silent: false }) => {
    if (get().isSyncing) {
      return { ok: true };
    }

    if (!get().isGoogleConnected) {
      return { ok: false, error: 'Conta Google não conectada.' };
    }

    const shouldShowFullLoading = !options.silent && get().tasks.length === 0;
    set({
      isSyncing: true,
      ...(shouldShowFullLoading ? { isLoading: true } : {}),
    });

    try {
      const [listsRes, tasksRes, userRes] = await Promise.all([
        currentService.getLists(),
        currentService.getTasks(),
        currentService.getUserProfile(),
      ]);

      if (!listsRes.ok || !tasksRes.ok) {
        set({ isSyncing: false, isLoading: false });
        return {
          ok: false,
          error: (!tasksRes.ok && tasksRes.error) || (!listsRes.ok && listsRes.error) || 'Erro ao sincronizar tarefas.',
        };
      }

      const starredSet = getStoredStarred();
      const storedTimes = getStoredTimes();
      const localTasksMap = new Map(get().tasks.map((t) => [t.id, t]));
      const rawServerTasks = tasksRes.ok ? tasksRes.data : get().tasks;
      let timesUpdated = false;

      // Poda chaves órfãs (tarefa deletada no servidor)
      const serverIds = new Set(rawServerTasks.map((t) => t.id));
      let starredPruned = false;
      for (const id of Array.from(starredSet)) {
        if (!serverIds.has(id)) {
          starredSet.delete(id);
          starredPruned = true;
        }
      }
      if (starredPruned) saveStoredStarred(starredSet);
      let timesPruned = false;
      for (const id of Object.keys(storedTimes)) {
        if (!serverIds.has(id)) {
          delete storedTimes[id];
          timesPruned = true;
        }
      }

      const enrichedTasks = rawServerTasks.map((t) => {
        // If this task has an active optimistic mutation in flight, preserve the local optimistic state
        if (pendingTaskActionIds.has(t.id)) {
          const local = localTasksMap.get(t.id);
          if (local) return local;
        }

        // Auto-detect time from notes or title in "00:00" format (e.g. set from mobile or web)
        const detectedTime = extractTimeFromText(t.notes) || extractTimeFromText(t.title);
        const time = storedTimes[t.id] || detectedTime || t.time;

        if (detectedTime && storedTimes[t.id] !== detectedTime) {
          storedTimes[t.id] = detectedTime;
          timesUpdated = true;
        }

        const starred = starredSet.has(t.id);
        // Preserva referência se nada local mudou (ajuda React.memo)
        const local = localTasksMap.get(t.id);
        if (
          local &&
          !pendingTaskActionIds.has(t.id) &&
          local.starred === starred &&
          local.time === time &&
          local.title === t.title &&
          local.notes === t.notes &&
          local.completed === t.completed &&
          local.due === t.due &&
          local.updatedAt === t.updatedAt &&
          local.subtasks === t.subtasks
        ) {
          return local;
        }

        return {
          ...t,
          starred,
          time,
        };
      });

      if (timesUpdated || timesPruned) {
        saveStoredTimes(storedTimes);
      }

      // Preserve any optimistic tasks that were just created locally and haven't appeared on the server yet
      for (const [id, localTask] of localTasksMap.entries()) {
        if (pendingTaskActionIds.has(id) && !enrichedTasks.some((t) => t.id === id)) {
          enrichedTasks.push(localTask);
        }
      }

      const storedVisible = getStoredVisibleLists();
      const storedOrder = getStoredListOrder();
      const rawLists = listsRes.ok ? listsRes.data : get().lists;
      const orderedLists = applyListOrder(rawLists, storedOrder);
      const listIds = orderedLists.map((l) => l.id);

      const currentVisible = get().visibleListIds;
      const visibleListIds =
        currentVisible.length > 0
          ? currentVisible.filter((id) => listIds.includes(id))
          : storedVisible && storedVisible.length > 0
            ? listIds.filter((id) => storedVisible.includes(id))
            : listIds;

      set({
        lists: orderedLists,
        tasks: enrichedTasks,
        user: userRes.ok ? userRes.data : get().user,
        visibleListIds: visibleListIds.length > 0 ? visibleListIds : listIds,
        lastSyncedAt: new Date(),
        isSyncing: false,
        isLoading: false,
      });

      return { ok: true };
    } catch (err: unknown) {
      set({ isSyncing: false, isLoading: false });
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Falha na sincronização.',
      };
    }
  },

  connectGoogle: async (clientId: string, clientSecret?: string) => {
    try {
      const authRes = await window.electronAPI?.googleLogin(clientId, clientSecret);

      if (!authRes || !authRes.ok || !authRes.data?.accessToken) {
        return { ok: false, error: authRes?.error || 'Falha ao conectar com o serviço de autenticação.' };
      }

      set({ isLoading: true });

      // Switch to real GoogleTasksService via factory (desacoplado)
      currentService = createTasksService(authRes.data.accessToken);
      set({ isGoogleConnected: true });

      const syncResult = await get().syncTasks({ silent: false });
      if (syncResult.ok) {
        set({ isSettingsOpen: false });
      }

      return syncResult;
    } catch (err: unknown) {
      set({ isLoading: false });
      return { ok: false, error: err instanceof Error ? err.message : 'Erro ao conectar' };
    }
  },

  disconnectGoogle: async () => {
    await window.electronAPI?.googleLogout();
    currentService = createTasksService();
    set({
      isGoogleConnected: false,
      isSyncing: false,
      lastSyncedAt: null,
      lists: [],
      tasks: [],
      user: {
        displayName: 'Conta Google',
        email: 'Faça login para sincronizar',
        photoUrl: '',
        isAuthenticated: false,
      },
    });
  },

  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
  setDraggedTaskId: (draggedTaskId) => set({ draggedTaskId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowCompleted: (showCompleted) => set({ showCompleted }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  openCreateTaskModal: (initialListId) => {
    const { activeFilter, lists } = get();
    const isSmart = ['all', 'starred', 'today', 'tomorrow', 'overdue', 'completed'].includes(activeFilter);
    const target = initialListId || (isSmart ? lists[0]?.id || '' : activeFilter);
    set({ isTaskModalOpen: true, editingTask: null, modalTargetListId: target });
  },

  openEditTaskModal: (task) => {
    set({ isTaskModalOpen: true, editingTask: task, modalTargetListId: task.listId });
  },

  closeTaskModal: () => {
    set({ isTaskModalOpen: false, editingTask: null, modalTargetListId: null });
  },

  saveTaskFromModal: async (params) => {
    const finalNotes = syncTimeToNotes(params.notes, params.time);

    if (params.id) {
      // Edit existing task
      const { tasks, moveTaskToList, updateTask } = get();
      const existing = tasks.find((t) => t.id === params.id);
      if (!existing) return;

      const storedTimes = getStoredTimes();
      if (params.time) {
        storedTimes[params.id] = params.time;
      } else {
        delete storedTimes[params.id];
      }
      saveStoredTimes(storedTimes);

      // Optimistic update
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === params.id
            ? {
                ...t,
                title: params.title,
                notes: finalNotes,
                due: params.due,
                time: params.time,
              }
            : t
        ),
      }));

      // Check if list changed
      if (params.listId && params.listId !== existing.listId) {
        await moveTaskToList(params.id, params.listId);
      }

      await updateTask(params.id, {
        title: params.title,
        notes: finalNotes,
        due: params.due,
        time: params.time,
      });

      set({ isTaskModalOpen: false, editingTask: null, modalTargetListId: null });
    } else {
      // Create new task
      const res = await currentService.createTask({
        listId: params.listId,
        title: params.title,
        due: params.due,
        notes: finalNotes,
      });

      if (res.ok) {
        if (params.time) {
          const storedTimes = getStoredTimes();
          storedTimes[res.data.id] = params.time;
          saveStoredTimes(storedTimes);
        }

        const newTask: Task = {
          ...res.data,
          notes: finalNotes,
          starred: false,
          time: params.time,
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
          isTaskModalOpen: false,
          editingTask: null,
          modalTargetListId: null,
        }));
      }
    }
  },

  toggleTaskStar: (taskId) => {
    const starredSet = getStoredStarred();
    const isStarred = starredSet.has(taskId);
    if (isStarred) {
      starredSet.delete(taskId);
    } else {
      starredSet.add(taskId);
    }
    saveStoredStarred(starredSet);

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, starred: !isStarred } : t
      ),
    }));
  },

  setListSort: (listId, sort) => {
    set((state) => ({
      listSort: { ...state.listSort, [listId]: sort },
    }));
  },

  toggleListVisibility: (listId) => {
    const { visibleListIds, lists } = get();
    let next: string[];
    if (visibleListIds.includes(listId)) {
      next = visibleListIds.filter((id) => id !== listId);
      if (next.length === 0 && lists.length > 0) {
        next = [listId];
      }
    } else {
      next = [...visibleListIds, listId];
    }
    saveStoredVisibleLists(next);
    set({ visibleListIds: next });
  },

  setAllListsVisible: () => {
    const { lists } = get();
    const next = lists.map((l) => l.id);
    saveStoredVisibleLists(next);
    set({ visibleListIds: next });
  },

  toggleTaskCompletion: async (taskId) => {
    if (pendingTaskActionIds.has(taskId)) return;
    pendingTaskActionIds.add(taskId);

    const prevTask = get().tasks.find((t) => t.id === taskId);
    if (!prevTask) {
      pendingTaskActionIds.delete(taskId);
      return;
    }

    const newCompleted = !prevTask.completed;

    // 1. Optimistic mutation
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : undefined,
            }
          : t
      ),
    }));

    try {
      const res = await currentService.toggleTaskCompletion(taskId, prevTask.listId, newCompleted);
      if (!res.ok) {
        console.warn('[useTaskStore] Falha ao alternar conclusão da tarefa, revertendo:', res.error);
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? prevTask : t)),
        }));
      }
    } catch (err) {
      console.error('[useTaskStore] Erro de rede ao alternar tarefa, revertendo:', err);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? prevTask : t)),
      }));
    } finally {
      pendingTaskActionIds.delete(taskId);
    }
  },

  createTask: async (title, customListId, due) => {
    if (!title.trim()) return;
    const { activeFilter, lists } = get();

    let targetListId = customListId;
    if (!targetListId) {
      const isSmart = ['all', 'starred', 'today', 'tomorrow', 'overdue', 'completed'].includes(activeFilter);
      if (isSmart) {
        targetListId = lists[0]?.id || '@default';
      } else {
        targetListId = activeFilter;
      }
    }

    const detectedTime = extractTimeFromText(title);
    const initialNotes = detectedTime ? syncTimeToNotes('', detectedTime) : undefined;

    const res = await currentService.createTask({
      listId: targetListId,
      title: title.trim(),
      due,
      notes: initialNotes,
    });

    if (res.ok) {
      if (detectedTime) {
        const storedTimes = getStoredTimes();
        storedTimes[res.data.id] = detectedTime;
        saveStoredTimes(storedTimes);
      }
      set((state) => ({
        tasks: [
          ...state.tasks,
          {
            ...res.data,
            notes: initialNotes || res.data.notes,
            time: detectedTime,
          },
        ],
      }));
    }
  },

  updateTask: async (taskId, updates) => {
    const prevTask = get().tasks.find((t) => t.id === taskId);
    if (!prevTask) return;

    pendingTaskActionIds.add(taskId);

    let resolvedTime = updates.time;
    if (resolvedTime === undefined) {
      if (updates.notes !== undefined) {
        resolvedTime = extractTimeFromText(updates.notes);
      } else if (updates.title !== undefined) {
        resolvedTime = extractTimeFromText(updates.title);
      }
    }

    if (resolvedTime !== undefined) {
      const storedTimes = getStoredTimes();
      if (resolvedTime) {
        storedTimes[taskId] = resolvedTime;
      } else {
        delete storedTimes[taskId];
      }
      saveStoredTimes(storedTimes);
    }

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              ...updates,
              ...(resolvedTime !== undefined ? { time: resolvedTime } : {}),
            }
          : t
      ),
    }));

    try {
      const res = await currentService.updateTask(taskId, updates, prevTask.listId);
      if (!res.ok) {
        console.warn('[useTaskStore] Falha ao atualizar tarefa, revertendo:', res.error);
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? prevTask : t)),
        }));
      }
    } catch (err) {
      console.error('[useTaskStore] Erro ao atualizar tarefa, revertendo:', err);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? prevTask : t)),
      }));
    } finally {
      pendingTaskActionIds.delete(taskId);
    }
  },

  moveTaskToList: async (taskId, targetListId) => {
    const prevTask = get().tasks.find((t) => t.id === taskId);
    if (!prevTask || prevTask.listId === targetListId) return;

    pendingTaskActionIds.add(taskId);

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, listId: targetListId } : t)),
    }));

    try {
      const res = await currentService.moveTaskToList(taskId, targetListId);
      if (res.ok) {
        const newTaskId = res.data.id;
        if (prevTask.time) {
          const storedTimes = getStoredTimes();
          storedTimes[newTaskId] = prevTask.time;
          delete storedTimes[taskId];
          saveStoredTimes(storedTimes);
        }

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...res.data,
                  starred: prevTask.starred,
                  time: prevTask.time,
                  isAllDay: prevTask.isAllDay,
                  subtasks: prevTask.subtasks,
                }
              : t
          ),
          selectedTaskId: state.selectedTaskId === taskId ? newTaskId : state.selectedTaskId,
          editingTask:
            state.editingTask?.id === taskId
              ? { ...state.editingTask, id: newTaskId, listId: targetListId }
              : state.editingTask,
        }));
      } else {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? prevTask : t)),
        }));
      }
    } catch (err) {
      console.error('[useTaskStore] Erro ao mover tarefa entre listas, revertendo:', err);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? prevTask : t)),
      }));
    } finally {
      pendingTaskActionIds.delete(taskId);
    }
  },

  deleteTask: async (taskId) => {
    const { tasks, selectedTaskId, editingTask } = get();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    const deletedTask = tasks[taskIndex];
    if (!deletedTask) return;

    pendingTaskActionIds.add(taskId);

    const storedTimes = getStoredTimes();
    if (storedTimes[taskId]) {
      delete storedTimes[taskId];
      saveStoredTimes(storedTimes);
    }

    // Optimistic deletion
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTaskId: selectedTaskId === taskId ? null : selectedTaskId,
      isTaskModalOpen: editingTask?.id === taskId ? false : state.isTaskModalOpen,
      editingTask: editingTask?.id === taskId ? null : editingTask,
    }));

    try {
      const res = await currentService.deleteTask(taskId, deletedTask.listId);
      if (!res.ok) {
        console.warn('[useTaskStore] Falha ao excluir tarefa, restaurando:', res.error);
        set((state) => {
          const next = [...state.tasks];
          next.splice(taskIndex, 0, deletedTask);
          return { tasks: next };
        });
      }
    } catch (err) {
      console.error('[useTaskStore] Erro ao excluir tarefa, restaurando:', err);
      set((state) => {
        const next = [...state.tasks];
        next.splice(taskIndex, 0, deletedTask);
        return { tasks: next };
      });
    } finally {
      pendingTaskActionIds.delete(taskId);
    }
  },

  createList: async (title) => {
    const res = await currentService.createList(title);
    if (res.ok) {
      set((state) => {
        const nextLists = [...state.lists, res.data];
        const nextVisible = [...state.visibleListIds, res.data.id];
        saveStoredListOrder(nextLists.map((l) => l.id));
        saveStoredVisibleLists(nextVisible);
        return {
          lists: nextLists,
          visibleListIds: nextVisible,
        };
      });
      return res.data;
    }
    return null;
  },

  renameList: async (listId, title) => {
    if (!title.trim()) return;
    const res = await currentService.renameList(listId, title.trim());
    if (res.ok) {
      set((state) => ({
        lists: state.lists.map((l) => (l.id === listId ? { ...l, title: title.trim() } : l)),
      }));
    }
  },

  deleteList: async (listId) => {
    const snapshot = { lists: get().lists, tasks: get().tasks, activeFilter: get().activeFilter };
    set((state) => {
      const nextLists = state.lists.filter((l) => l.id !== listId);
      saveStoredListOrder(nextLists.map((l) => l.id));
      return {
        lists: nextLists,
        tasks: state.tasks.filter((t) => t.listId !== listId),
        activeFilter: snapshot.activeFilter === listId ? 'all' : snapshot.activeFilter,
      };
    });
    try {
      const res = await currentService.deleteList(listId);
      if (!res.ok) {
        set({ lists: snapshot.lists, tasks: snapshot.tasks, activeFilter: snapshot.activeFilter });
      }
    } catch {
      set({ lists: snapshot.lists, tasks: snapshot.tasks, activeFilter: snapshot.activeFilter });
    }
  },

  reorderList: (sourceListId: string, targetListId: string) => {
    if (sourceListId === targetListId) return;
    const { lists } = get();
    const sourceIndex = lists.findIndex((l) => l.id === sourceListId);
    const targetIndex = lists.findIndex((l) => l.id === targetListId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newLists = [...lists];
    const [movedList] = newLists.splice(sourceIndex, 1);
    newLists.splice(targetIndex, 0, movedList);

    saveStoredListOrder(newLists.map((l) => l.id));
    set({ lists: newLists });
  },

  addSubtask: async (taskId, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const tempId = `temp-sub-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    pendingTaskActionIds.add(tempId);
    pendingTaskActionIds.add(taskId);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, { id: tempId, parentId: taskId, title: trimmed, completed: false }] }
          : t
      ),
    }));

    try {
      const res = await currentService.addSubtask(taskId, trimmed);
      if (res.ok && res.data.subtasks && res.data.subtasks.length > 0) {
        const createdSubtask = res.data.subtasks[0];
        // Troca tempId pelo id real
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.map((s) => (s.id === tempId ? createdSubtask : s)) }
              : t
          ),
        }));
      } else {
        // Rollback do otimista
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== tempId) } : t
          ),
        }));
      }
    } catch {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== tempId) } : t
        ),
      }));
    } finally {
      pendingTaskActionIds.delete(tempId);
      pendingTaskActionIds.delete(taskId);
    }
  },

  toggleSubtaskCompletion: async (taskId, subtaskId) => {
    const parentTask = get().tasks.find((t) => t.id === taskId);
    const prevSubtask = parentTask?.subtasks.find((s) => s.id === subtaskId);
    if (!prevSubtask || !parentTask) return;

    const newCompleted = !prevSubtask.completed;

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: newCompleted } : s
              ),
            }
          : t
      ),
    }));

    try {
      const res = await currentService.toggleSubtaskCompletion(
        taskId,
        subtaskId,
        parentTask.listId,
        newCompleted
      );
      if (!res.ok) {
        console.warn('[useTaskStore] Falha ao alternar subtarefa, revertendo:', res.error);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((s) => (s.id === subtaskId ? prevSubtask : s)),
                }
              : t
          ),
        }));
      }
    } catch (err) {
      console.error('[useTaskStore] Erro ao alternar subtarefa, revertendo:', err);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) => (s.id === subtaskId ? prevSubtask : s)),
              }
            : t
        ),
      }));
    }
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const parentTask = get().tasks.find((t) => t.id === taskId);
    const prevSubtask = parentTask?.subtasks.find((s) => s.id === subtaskId);
    const subtaskIndex = parentTask?.subtasks.findIndex((s) => s.id === subtaskId) ?? -1;
    if (!prevSubtask) return;

    // Optimistic deletion
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
            }
          : t
      ),
    }));

    try {
      const res = await currentService.deleteSubtask(taskId, subtaskId);
      if (!res.ok) {
        console.warn('[useTaskStore] Falha ao excluir subtarefa, restaurando:', res.error);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (() => {
                    const restored = [...t.subtasks];
                    restored.splice(subtaskIndex, 0, prevSubtask);
                    return restored;
                  })(),
                }
              : t
          ),
        }));
      }
    } catch (err) {
      console.error('[useTaskStore] Erro ao excluir subtarefa, restaurando:', err);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: (() => {
                  const restored = [...t.subtasks];
                  restored.splice(subtaskIndex, 0, prevSubtask);
                  return restored;
                })(),
              }
            : t
        ),
      }));
    }
  },

  clearCompletedTasks: async (listId) => {
    const snapshot = get().tasks;
    if (listId === 'all' || listId === 'starred') {
      // Clear across all user lists em paralelo
      set((state) => ({ tasks: state.tasks.filter((t) => !t.completed) }));
      const results = await Promise.allSettled(get().lists.map((l) => currentService.clearCompletedTasks(l.id)));
      const failed = results.some((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      if (failed) set({ tasks: snapshot });
    } else {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.listId !== listId || !t.completed),
      }));
      try {
        const res = await currentService.clearCompletedTasks(listId);
        if (!res.ok) set({ tasks: snapshot });
      } catch {
        set({ tasks: snapshot });
      }
    }
  },

  reorderTask: async (taskId, targetPreviousTaskId, destinationListId) => {
    const { tasks } = get();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    pendingTaskActionIds.add(taskId);

    const task = tasks[taskIndex];
    const originalTasks = [...tasks];
    const sourceListId = task.listId;
    const targetListId = destinationListId || sourceListId;
    const isCrossList = targetListId !== sourceListId;

    const updatedTask: Task = { ...task, listId: targetListId };
    const newTasks = [...tasks];
    newTasks.splice(taskIndex, 1);

    if (targetPreviousTaskId) {
      const prevIdx = newTasks.findIndex((t) => t.id === targetPreviousTaskId);
      if (prevIdx !== -1) {
        newTasks.splice(prevIdx + 1, 0, updatedTask);
      } else {
        newTasks.push(updatedTask);
      }
    } else {
      // Put at the very beginning of the target list
      const firstListIdx = newTasks.findIndex((t) => t.listId === targetListId);
      if (firstListIdx !== -1) {
        newTasks.splice(firstListIdx, 0, updatedTask);
      } else {
        newTasks.unshift(updatedTask);
      }
    }

    set({ tasks: newTasks });

    try {
      const res = await currentService.moveTaskPosition(sourceListId, taskId, {
        previous: targetPreviousTaskId || undefined,
        destinationTasklist: isCrossList ? targetListId : undefined,
      });

      if (!res.ok) {
        if (isCrossList) {
          console.warn('[useTaskStore] /move com destinationTasklist falhou, tentando fallback atômico:', res.error);
          const fallbackRes = await currentService.moveTaskToList(taskId, targetListId);
          if (!fallbackRes.ok) {
            set({ tasks: originalTasks });
            return;
          }
          const movedId = fallbackRes.data.id;
          if (targetPreviousTaskId) {
            await currentService.moveTaskPosition(targetListId, movedId, {
              previous: targetPreviousTaskId,
            });
          }
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, id: movedId } : t)),
            selectedTaskId: state.selectedTaskId === taskId ? movedId : state.selectedTaskId,
          }));
          return;
        }

        console.warn('[useTaskStore] Falha ao mover posição da tarefa na API Google, revertendo:', res.error);
        set({ tasks: originalTasks });
      } else if (res.data?.position) {
        // Record updated position string from Google Tasks
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, position: res.data.position } : t
          ),
        }));
      }
    } catch (err) {
      console.error('[useTaskStore] Erro ao mover tarefa:', err);
      set({ tasks: originalTasks });
    } finally {
      pendingTaskActionIds.delete(taskId);
    }
  },

  promoteSubtask: async (taskId, subtaskId) => {
    const { tasks } = get();
    const parentTask = tasks.find((t) => t.id === taskId);
    if (!parentTask) return;

    const subtask = parentTask.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    // Optimistically update
    const newTopTask: Task = {
      id: subtaskId,
      listId: parentTask.listId,
      title: subtask.title,
      completed: subtask.completed,
      subtasks: [],
      updatedAt: new Date().toISOString(),
    };
    const snapshot = get().tasks;

    set((state) => ({
      tasks: [
        ...state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
            : t
        ),
        newTopTask,
      ],
    }));

    try {
      const res = await currentService.promoteSubtask(taskId, subtaskId);
      if (!res.ok) set({ tasks: snapshot });
    } catch {
      set({ tasks: snapshot });
    }
  },
}));

