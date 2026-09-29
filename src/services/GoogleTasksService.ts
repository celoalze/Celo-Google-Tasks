import { ITasksService } from './ITasksService';
import { Result, success, failure } from '../contracts/api.types';
import { Task, TaskAssignmentInfo, TaskLink, TaskList, UserProfile } from '../contracts/tasks.types';
import { toGoogleDueIso } from '../core/dateUtils';

export interface GoogleApiConfig {
  accessToken: string;
}

interface GoogleTaskRawItem {
  id: string;
  title?: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  parent?: string;
  completed?: string;
  updated?: string;
  position?: string;
  links?: Array<{ type: string; description?: string; link: string }>;
  assignmentInfo?: TaskAssignmentInfo;
  webViewLink?: string;
}

interface GoogleTaskResponse {
  id: string;
  title?: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  position?: string;
  links?: TaskLink[];
  assignmentInfo?: TaskAssignmentInfo;
  webViewLink?: string;
}

interface GoogleTaskPatchBody {
  title?: string;
  notes?: string;
  due?: string | null;
  status?: 'needsAction' | 'completed';
  completed?: string | null;
}

function normalizeDueForGoogle(due?: string): string | undefined {
  if (!due) return undefined;
  const datePart = due.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return undefined;
  try {
    return toGoogleDueIso(datePart);
  } catch {
    return undefined;
  }
}

export class GoogleTasksService implements ITasksService {
  private config: GoogleApiConfig;
  private baseUrl = 'https://tasks.googleapis.com/tasks/v1';
  // Cache of taskId -> listId to enable lookups for update/delete
  private taskToListMap = new Map<string, string>();

  private inFlightTasksPromise: Promise<Result<Task[]>> | null = null;

  private pruneListEntries(listId: string): void {
    for (const [taskId, mappedListId] of this.taskToListMap) {
      if (mappedListId === listId) this.taskToListMap.delete(taskId);
    }
  }

  constructor(config: GoogleApiConfig) {
    this.config = config;
  }

  public updateAccessToken(token: string) {
    this.config.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
    retryCount = 0
  ): Promise<Result<T>> {
    if (!this.config.accessToken) {
      return failure('Não autenticado com o Google. Faça login para continuar.');
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
      });

      // Automatically attempt to refresh expired access token on HTTP 401
      if (res.status === 401 && !isRetry && typeof window !== 'undefined' && window.electronAPI?.getGoogleSession) {
        try {
          const session = await window.electronAPI.getGoogleSession();
          if (session.ok && session.data?.accessToken) {
            this.config.accessToken = session.data.accessToken;
            return this.request<T>(endpoint, options, true, retryCount);
          }
        } catch (refreshErr) {
          console.warn('[GoogleTasksService] Falha ao renovar token expirado:', refreshErr);
        }
      }

      // Handle HTTP 429 Too Many Requests or 503/504 temporary errors with exponential backoff
      if ((res.status === 429 || res.status === 503 || res.status === 504) && retryCount < 2) {
        const backoffMs = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
        console.warn(`[GoogleTasksService] Status ${res.status} recebido. Tentando novamente em ${Math.round(backoffMs)}ms (tentativa ${retryCount + 1}/2)...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.request<T>(endpoint, options, isRetry, retryCount + 1);
      }

      if (!res.ok) {
        const errorText = await res.text();
        return failure(`Erro na API Google Tasks (${res.status}): ${errorText}`);
      }

      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return success(undefined as unknown as T);
      }

      const data = await res.json();
      return success(data);
    } catch (err: unknown) {
      if (retryCount < 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return this.request<T>(endpoint, options, isRetry, retryCount + 1);
      }
      return failure(err instanceof Error ? err.message : 'Erro de conexão com a API Google');
    }
  }

  async getUserProfile(): Promise<Result<UserProfile>> {
    if (!this.config.accessToken) {
      return success({
        displayName: 'Conectar ao Google',
        email: 'Clique para autenticar',
        photoUrl: '',
        isAuthenticated: false,
      });
    }

    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
      });
      if (res.ok) {
        const info = (await res.json()) as { name?: string; email?: string; picture?: string };
        return success({
          displayName: info.name || 'Usuário Google',
          email: info.email || '',
          photoUrl: info.picture || '',
          isAuthenticated: true,
        });
      }
    } catch (err) {
      console.warn('Falha ao buscar perfil Google:', err);
    }

    return success({
      displayName: 'Conectar ao Google',
      email: 'Sessão expirada — reconecte',
      photoUrl: '',
      isAuthenticated: false,
    });
  }

  async getLists(): Promise<Result<TaskList[]>> {
    interface GoogleListResponse {
      items?: Array<{ id: string; title: string; updated?: string }>;
      nextPageToken?: string;
    }
    const allLists: TaskList[] = [];
    let pageToken: string | undefined;

    do {
      const url = `/users/@me/lists?maxResults=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await this.request<GoogleListResponse>(url);
      if (!res.ok) return res;

      const items = res.data.items || [];
      for (const l of items) {
        allLists.push({
          id: l.id,
          title: l.title,
          updated: l.updated,
          icon: '📋',
        });
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    return success(allLists);
  }

  async createList(title: string): Promise<Result<TaskList>> {
    const res = await this.request<{ id: string; title: string; updated?: string }>(
      '/users/@me/lists',
      {
        method: 'POST',
        body: JSON.stringify({ title }),
      }
    );
    if (!res.ok) return res;

    return success({
      id: res.data.id,
      title: res.data.title,
      updated: res.data.updated,
      icon: '📋',
    });
  }

  async renameList(listId: string, title: string): Promise<Result<TaskList>> {
    const res = await this.request<{ id: string; title: string; updated?: string }>(
      `/users/@me/lists/${listId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }
    );
    if (!res.ok) return res;

    return success({
      id: res.data.id,
      title: res.data.title,
      updated: res.data.updated,
      icon: '📋',
    });
  }

  async deleteList(listId: string): Promise<Result<void>> {
    const res = await this.request<void>(`/users/@me/lists/${listId}`, {
      method: 'DELETE',
    });
    if (res.ok) this.pruneListEntries(listId);
    return res;
  }

  async clearCompletedTasks(listId: string): Promise<Result<void>> {
    const res = await this.request<void>(`/lists/${listId}/clear`, {
      method: 'POST',
    });
    return res;
  }

  async getTasks(): Promise<Result<Task[]>> {
    if (this.inFlightTasksPromise) {
      return this.inFlightTasksPromise;
    }

    this.inFlightTasksPromise = (async () => {
      try {
        const listsRes = await this.getLists();
        if (!listsRes.ok) return listsRes;

        interface GoogleTasksResponse {
          items?: GoogleTaskRawItem[];
          nextPageToken?: string;
        }

        // Fetch tasks with controlled concurrency (max 4 lists at a time to prevent 429 rate limits)
        const concurrencyLimit = 4;
        const listResults: Array<{ listId: string; rawItems: GoogleTaskRawItem[] }> = new Array(listsRes.data.length);
        let listIndex = 0;

        const fetchWorker = async () => {
          while (listIndex < listsRes.data.length) {
            const currentIdx = listIndex++;
            const list = listsRes.data[currentIdx];
            const rawItems: GoogleTaskRawItem[] = [];
            let pageToken: string | undefined;

            do {
              const query = `/lists/${list.id}/tasks?showCompleted=true&showHidden=true&maxResults=100${
                pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
              }`;
              const tasksRes = await this.request<GoogleTasksResponse>(query);
              if (!tasksRes.ok) break;

              if (tasksRes.data.items) {
                rawItems.push(...tasksRes.data.items);
              }
              pageToken = tasksRes.data.nextPageToken;
            } while (pageToken);

            listResults[currentIdx] = { listId: list.id, rawItems };
          }
        };

        const workers = Array.from(
          { length: Math.min(concurrencyLimit, listsRes.data.length) },
          () => fetchWorker()
        );
        await Promise.all(workers);

        const allTasks: Task[] = [];

        for (const { listId, rawItems } of listResults) {
          if (rawItems.length === 0) continue;

          // Group subtasks by parent id
          const subtasksMap = new Map<
            string,
            Array<{ id: string; parentId: string; title: string; completed: boolean; completedAt?: string; position?: string }>
          >();

          rawItems.forEach((item) => {
            this.taskToListMap.set(item.id, listId);
            if (item.parent) {
              const listSubs = subtasksMap.get(item.parent) || [];
              listSubs.push({
                id: item.id,
                parentId: item.parent,
                title: item.title || '',
                completed: item.status === 'completed',
                completedAt: item.completed,
                position: item.position,
              });
              subtasksMap.set(item.parent, listSubs);
            }
          });

          rawItems.forEach((item) => {
            if (!item.parent) {
              allTasks.push({
                id: item.id,
                listId: listId,
                title: item.title || '',
                notes: item.notes || '',
                completed: item.status === 'completed',
                completedAt: item.completed,
                due: item.due,
                subtasks: subtasksMap.get(item.id) || [],
                position: item.position,
                updatedAt: item.updated,
                links: item.links,
                assignmentInfo: item.assignmentInfo,
                webViewLink: item.webViewLink,
              });
            }
          });
        }

        return success(allTasks);
      } finally {
        this.inFlightTasksPromise = null;
      }
    })();

    return this.inFlightTasksPromise;
  }

  async createTask(params: {
    listId: string;
    title: string;
    due?: string;
    notes?: string;
  }): Promise<Result<Task>> {
    interface GoogleTaskResponse {
      id: string;
      title?: string;
      notes?: string;
      status: 'needsAction' | 'completed';
      due?: string;
      updated?: string;
      position?: string;
    }

    const payload: { title: string; notes?: string; due?: string } = {
      title: params.title,
    };
    if (params.notes) payload.notes = params.notes;
    const normalizedDue = normalizeDueForGoogle(params.due);
    if (normalizedDue) payload.due = normalizedDue;

    const res = await this.request<GoogleTaskResponse>(`/lists/${params.listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) return res;

    this.taskToListMap.set(res.data.id, params.listId);

    return success({
      id: res.data.id,
      listId: params.listId,
      title: res.data.title || params.title,
      notes: res.data.notes || '',
      completed: res.data.status === 'completed',
      due: res.data.due,
      subtasks: [],
      position: res.data.position,
      updatedAt: res.data.updated,
    });
  }

  async updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'subtasks'>>,
    listId?: string
  ): Promise<Result<Task>> {
    const resolvedListId = listId || updates.listId || this.taskToListMap.get(taskId);
    if (!resolvedListId) {
      return failure(`Lista da tarefa ${taskId} não encontrada`);
    }
    this.taskToListMap.set(taskId, resolvedListId);

    const patchBody: GoogleTaskPatchBody = {};
    if (updates.title !== undefined) patchBody.title = updates.title;
    if (updates.notes !== undefined) patchBody.notes = updates.notes;
    if (updates.due !== undefined) {
      patchBody.due = updates.due ? normalizeDueForGoogle(updates.due) || null : null;
    }
    if (updates.completed !== undefined) {
      patchBody.status = updates.completed ? 'completed' : 'needsAction';
      if (!updates.completed) {
        patchBody.completed = null;
      }
    }

    const res = await this.request<GoogleTaskResponse>(`/lists/${resolvedListId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(patchBody),
    });

    if (!res.ok) return res;

    return success({
      id: taskId,
      listId: resolvedListId,
      title: res.data.title || updates.title || '',
      notes: res.data.notes || updates.notes || '',
      completed: res.data.status === 'completed',
      due: res.data.due ?? updates.due,
      subtasks: [],
      updatedAt: res.data.updated,
    });
  }

  async moveTaskToList(taskId: string, targetListId: string): Promise<Result<Task>> {
    const sourceListId = this.taskToListMap.get(taskId);
    if (!sourceListId) {
      return failure('Lista de origem não encontrada');
    }
    if (sourceListId === targetListId) {
      return failure('A tarefa já está nessa lista');
    }

    // 1. Fetch current task details + subtasks (flat list filtrada por parent)
    const currentRes = await this.request<GoogleTaskRawItem>(`/lists/${sourceListId}/tasks/${taskId}`);
    if (!currentRes.ok) return currentRes;

    const sourceData = currentRes.data;

    // 2. Create task in destination list
    const createRes = await this.createTask({
      listId: targetListId,
      title: sourceData.title || '',
      due: sourceData.due,
      notes: sourceData.notes,
    });
    if (!createRes.ok) return createRes;

    const newTask = createRes.data;

    // Migra subtarefas: recria cada filha sob o novo pai para não deixar órfãs na origem
    const listTasksRes = await this.request<{ items?: GoogleTaskRawItem[] }>(
      `/lists/${sourceListId}/tasks?showCompleted=true&showHidden=true&maxResults=100`
    );
    if (listTasksRes.ok && listTasksRes.data.items) {
      const children = listTasksRes.data.items.filter((item) => item.parent === taskId);
      for (const child of children) {
        const subRes = await this.request<GoogleTaskResponse>(
          `/lists/${targetListId}/tasks?parent=${encodeURIComponent(newTask.id)}`,
          { method: 'POST', body: JSON.stringify({ title: child.title || '', notes: child.notes }) }
        );
        if (subRes.ok) {
          this.taskToListMap.set(subRes.data.id, targetListId);
          if (child.status === 'completed') {
            await this.updateTask(subRes.data.id, { completed: true }, targetListId);
          }
        }
      }
    }

    // If task was completed, update status (com checagem de erro)
    if (sourceData.status === 'completed') {
      const completedRes = await this.updateTask(newTask.id, { completed: true });
      if (!completedRes.ok) {
        await this.deleteTask(newTask.id, targetListId);
        return failure(`Falha ao preservar conclusão no move: ${completedRes.error}`);
      }
    }

    // 3. Delete from old list (com rollback se falhar para evitar duplicata)
    const deleteRes = await this.deleteTask(taskId);
    if (!deleteRes.ok) {
      await this.deleteTask(newTask.id, targetListId);
      return failure(`Falha ao remover origem no move: ${deleteRes.error}`);
    }

    return success(newTask);
  }

  async deleteTask(taskId: string, listId?: string): Promise<Result<void>> {
    const resolvedListId = listId || this.taskToListMap.get(taskId);
    if (!resolvedListId) {
      return failure(`Lista da tarefa ${taskId} não encontrada`);
    }

    const res = await this.request<void>(`/lists/${resolvedListId}/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      this.taskToListMap.delete(taskId);
    }

    return res;
  }

  async toggleTaskCompletion(
    taskId: string,
    listId?: string,
    targetCompleted?: boolean
  ): Promise<Result<Task>> {
    const resolvedListId = listId || this.taskToListMap.get(taskId);
    if (!resolvedListId) return failure('Lista da tarefa não encontrada');

    this.taskToListMap.set(taskId, resolvedListId);

    let isCompleted: boolean;
    if (targetCompleted !== undefined) {
      isCompleted = targetCompleted;
    } else {
      const current = await this.request<{ id: string; status: string; title: string }>(
        `/lists/${resolvedListId}/tasks/${taskId}`
      );
      if (!current.ok) return current;
      isCompleted = current.data.status !== 'completed';
    }

    // Google Tasks API v1 requirements:
    // To complete: status is 'completed'
    // To uncomplete: status is 'needsAction' and completed MUST be set to null
    const payload = isCompleted
      ? { status: 'completed' }
      : { status: 'needsAction', completed: null };

    const patchRes = await this.request<GoogleTaskResponse>(`/lists/${resolvedListId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!patchRes.ok) return patchRes;

    return success({
      id: taskId,
      listId: resolvedListId,
      title: patchRes.data.title || '',
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      subtasks: [],
    });
  }

  async addSubtask(taskId: string, title: string): Promise<Result<Task>> {
    const listId = this.taskToListMap.get(taskId);
    if (!listId) return failure('Lista da tarefa não encontrada');

    // Create subtask directly nested under parent in 1 atomic HTTP call
    const createRes = await this.request<{
      id: string;
      title?: string;
      status: string;
      position?: string;
    }>(`/lists/${listId}/tasks?parent=${encodeURIComponent(taskId)}`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    if (!createRes.ok) return createRes;

    const newSubtaskId = createRes.data.id;
    this.taskToListMap.set(newSubtaskId, listId);

    return success({
      id: taskId,
      listId,
      title: '',
      completed: false,
      subtasks: [
        {
          id: newSubtaskId,
          parentId: taskId,
          title: createRes.data.title || title,
          completed: createRes.data.status === 'completed',
          position: createRes.data.position,
        },
      ],
    });
  }

  async toggleSubtaskCompletion(
    taskId: string,
    subtaskId: string,
    listId?: string,
    targetCompleted?: boolean
  ): Promise<Result<Task>> {
    const resolvedListId =
      listId || this.taskToListMap.get(subtaskId) || this.taskToListMap.get(taskId);
    if (!resolvedListId) return failure('Lista da subtarefa não encontrada');

    this.taskToListMap.set(subtaskId, resolvedListId);

    let isCompleted: boolean;
    if (targetCompleted !== undefined) {
      isCompleted = targetCompleted;
    } else {
      const current = await this.request<{ status: string }>(
        `/lists/${resolvedListId}/tasks/${subtaskId}`
      );
      if (!current.ok) return current;
      isCompleted = current.data.status !== 'completed';
    }

    const payload = isCompleted
      ? { status: 'completed' }
      : { status: 'needsAction', completed: null };

    const patchRes = await this.request<void>(`/lists/${resolvedListId}/tasks/${subtaskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!patchRes.ok) return patchRes;

    return success({
      id: taskId,
      listId: resolvedListId,
      title: '',
      completed: false,
      subtasks: [],
    });
  }

  async deleteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>> {
    const listId = this.taskToListMap.get(subtaskId) || this.taskToListMap.get(taskId);
    if (!listId) return failure('Lista não encontrada');

    const res = await this.request<void>(`/lists/${listId}/tasks/${subtaskId}`, {
      method: 'DELETE',
    });
    if (!res.ok) return res;

    this.taskToListMap.delete(subtaskId);

    return success({
      id: taskId,
      listId,
      title: '',
      completed: false,
      subtasks: [],
    });
  }

  async moveTaskPosition(
    listId: string,
    taskId: string,
    options: { parent?: string; previous?: string; destinationTasklist?: string }
  ): Promise<Result<Task>> {
    const resolvedListId = listId || this.taskToListMap.get(taskId) || '@default';
    const params = new URLSearchParams();
    if (options.parent) params.append('parent', options.parent);
    if (options.previous) params.append('previous', options.previous);
    if (options.destinationTasklist) params.append('destinationTasklist', options.destinationTasklist);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await this.request<GoogleTaskResponse>(`/lists/${resolvedListId}/tasks/${taskId}/move${query}`, {
      method: 'POST',
    });
    if (!res.ok) {
      console.error('[GoogleTasksService] Erro na requisição /move:', res.error);
      return res;
    }

    const finalTargetListId = options.destinationTasklist || resolvedListId;
    this.taskToListMap.set(taskId, finalTargetListId);

    return success({
      id: res.data.id,
      listId: finalTargetListId,
      title: res.data.title || '',
      notes: res.data.notes || '',
      completed: res.data.status === 'completed',
      completedAt: res.data.completed,
      due: res.data.due,
      position: res.data.position,
      subtasks: [],
      updatedAt: res.data.updated,
      links: res.data.links,
      assignmentInfo: res.data.assignmentInfo,
      webViewLink: res.data.webViewLink,
    });
  }

  async promoteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>> {
    const listId = this.taskToListMap.get(subtaskId) || this.taskToListMap.get(taskId);
    if (!listId) return failure('Lista da tarefa não encontrada');

    // In Google Tasks API, moving a subtask without parent moves it to the root level!
    return this.moveTaskPosition(listId, subtaskId, {});
  }
}

