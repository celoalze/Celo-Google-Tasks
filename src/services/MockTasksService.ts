import { ITasksService } from './ITasksService';
import { Result, success, failure } from '../contracts/api.types';
import { Task, TaskList, UserProfile } from '../contracts/tasks.types';

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export class MockTasksService implements ITasksService {
  private user: UserProfile = {
    displayName: 'Conta Google',
    email: 'Faça login para sincronizar',
    photoUrl: '',
    isAuthenticated: false,
  };

  private lists: TaskList[] = [];
  private tasks: Task[] = [];

  async getUserProfile(): Promise<Result<UserProfile>> {
    return success(this.user);
  }

  async getLists(): Promise<Result<TaskList[]>> {
    return success([...this.lists]);
  }

  async createList(title: string): Promise<Result<TaskList>> {
    const newList: TaskList = {
      id: newId('list'),
      title,
      icon: '📋',
      updated: new Date().toISOString(),
    };
    this.lists.push(newList);
    return success(newList);
  }

  async renameList(listId: string, title: string): Promise<Result<TaskList>> {
    const index = this.lists.findIndex((l) => l.id === listId);
    if (index === -1) return failure('Lista não encontrada');
    const updatedList: TaskList = {
      ...this.lists[index],
      title,
      updated: new Date().toISOString(),
    };
    this.lists[index] = updatedList;
    return success(updatedList);
  }

  async deleteList(listId: string): Promise<Result<void>> {
    this.lists = this.lists.filter((l) => l.id !== listId);
    this.tasks = this.tasks.filter((t) => t.listId !== listId);
    return success(undefined as void);
  }

  async getTasks(): Promise<Result<Task[]>> {
    return success([...this.tasks]);
  }

  async createTask(params: {
    listId: string;
    title: string;
    due?: string;
    notes?: string;
  }): Promise<Result<Task>> {
    if (!this.lists.some((l) => l.id === params.listId) && this.lists.length > 0) {
      return failure('Lista não encontrada');
    }
    const newTask: Task = {
      id: newId('task'),
      listId: params.listId,
      title: params.title,
      notes: params.notes || '',
      completed: false,
      due: params.due,
      subtasks: [],
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(newTask);
    return success(newTask);
  }

  async updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'subtasks'>>,
    listId?: string
  ): Promise<Result<Task>> {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      return failure('Tarefa não encontrada');
    }
    if (listId && this.tasks[index].listId !== listId) {
      return failure('Lista não encontrada para a tarefa');
    }
    const updated = { ...this.tasks[index], ...updates, updatedAt: new Date().toISOString() };
    this.tasks[index] = updated;
    return success(updated);
  }

  async moveTaskToList(taskId: string, targetListId: string): Promise<Result<Task>> {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return failure('Tarefa não encontrada');
    const source = this.tasks[index];
    if (source.listId === targetListId) return failure('A tarefa já está nessa lista');
    // Simula Google: cria NOVO id no destino (não reusa id)
    const moved: Task = {
      ...source,
      id: newId('task'),
      listId: targetListId,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.splice(index, 1);
    this.tasks.push(moved);
    return success(moved);
  }

  async deleteTask(taskId: string, listId?: string): Promise<Result<void>> {
    if (listId && !this.tasks.some((t) => t.id === taskId && t.listId === listId)) {
      return failure('Tarefa não encontrada na lista');
    }
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    return success(undefined as void);
  }

  async toggleTaskCompletion(
    taskId: string,
    _listId?: string,
    targetCompleted?: boolean
  ): Promise<Result<Task>> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return failure('Tarefa não encontrada');
    const newCompleted = targetCompleted !== undefined ? targetCompleted : !task.completed;
    return this.updateTask(taskId, {
      completed: newCompleted,
      completedAt: newCompleted ? new Date().toISOString() : undefined,
    });
  }

  async addSubtask(taskId: string, title: string): Promise<Result<Task>> {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return failure('Tarefa não encontrada');

    const task = this.tasks[index];
    const newSubtask = {
      id: newId('sub'),
      parentId: taskId,
      title,
      completed: false,
    };

    const updatedTask = {
      ...task,
      subtasks: [...task.subtasks, newSubtask],
    };

    this.tasks[index] = updatedTask;
    return success(updatedTask);
  }

  async toggleSubtaskCompletion(
    taskId: string,
    subtaskId: string,
    _listId?: string,
    targetCompleted?: boolean
  ): Promise<Result<Task>> {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return failure('Tarefa não encontrada');

    const task = this.tasks[taskIndex];
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId
        ? { ...s, completed: targetCompleted !== undefined ? targetCompleted : !s.completed }
        : s
    );

    const updatedTask = { ...task, subtasks: updatedSubtasks };
    this.tasks[taskIndex] = updatedTask;
    return success(updatedTask);
  }

  async deleteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>> {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return failure('Tarefa não encontrada');

    const task = this.tasks[taskIndex];
    const updatedSubtasks = task.subtasks.filter((s) => s.id !== subtaskId);

    const updatedTask = { ...task, subtasks: updatedSubtasks };
    this.tasks[taskIndex] = updatedTask;
    return success(updatedTask);
  }

  async clearCompletedTasks(listId: string): Promise<Result<void>> {
    this.tasks = this.tasks.filter((t) => t.listId !== listId || !t.completed);
    return success(undefined as void);
  }

  async moveTaskPosition(
    listId: string,
    taskId: string,
    options: { parent?: string; previous?: string; destinationTasklist?: string }
  ): Promise<Result<Task>> {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId && (!listId || t.listId === listId));
    if (taskIndex === -1) return failure('Tarefa não encontrada');
    const [task] = this.tasks.splice(taskIndex, 1);
    const updatedTask: Task = {
      ...task,
      listId: options.destinationTasklist || task.listId,
    };

    const scopeListId = updatedTask.listId;
    if (options.previous) {
      const prevIndex = this.tasks.findIndex((t) => t.id === options.previous && t.listId === scopeListId);
      if (prevIndex !== -1) {
        this.tasks.splice(prevIndex + 1, 0, updatedTask);
      } else {
        const lastInScope = this.tasks.map((t, i) => ({ t, i })).filter(({ t }) => t.listId === scopeListId).pop();
        if (lastInScope) this.tasks.splice(lastInScope.i + 1, 0, updatedTask);
        else this.tasks.push(updatedTask);
      }
    } else if (options.destinationTasklist) {
      const firstInDest = this.tasks.findIndex((t) => t.listId === options.destinationTasklist);
      if (firstInDest !== -1) {
        this.tasks.splice(firstInDest, 0, updatedTask);
      } else {
        this.tasks.unshift(updatedTask);
      }
    } else {
      this.tasks.unshift(updatedTask);
    }
    return success(updatedTask);
  }

  async promoteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>> {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return failure('Tarefa principal não encontrada');
    const parent = this.tasks[taskIndex];
    const subtask = parent.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return failure('Subtarefa não encontrada');

    // Remove from parent subtasks
    this.tasks[taskIndex] = {
      ...parent,
      subtasks: parent.subtasks.filter((s) => s.id !== subtaskId),
    };

    // Add as top-level task
    const newTopTask: Task = {
      id: subtaskId,
      listId: parent.listId,
      title: subtask.title,
      completed: subtask.completed,
      subtasks: [],
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(newTopTask);
    return success(newTopTask);
  }
}
