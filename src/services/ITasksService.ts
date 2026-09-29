import { Result } from '../contracts/api.types';
import { Task, TaskList, UserProfile } from '../contracts/tasks.types';

/** Campos graváveis na Google Tasks API v1 (PATCH). Locais (starred/time/...) ficam só no store. */
export type GoogleUpdatable = Pick<Task, 'title' | 'notes' | 'due' | 'completed' | 'listId'>;

export interface ITasksService {
  getUserProfile(): Promise<Result<UserProfile>>;
  getLists(): Promise<Result<TaskList[]>>;
  createList(title: string): Promise<Result<TaskList>>;
  renameList(listId: string, title: string): Promise<Result<TaskList>>;
  deleteList(listId: string): Promise<Result<void>>;

  getTasks(): Promise<Result<Task[]>>;
  createTask(params: {
    listId: string;
    title: string;
    due?: string;
    notes?: string;
  }): Promise<Result<Task>>;

  updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'subtasks'>>,
    listId?: string
  ): Promise<Result<Task>>;

  moveTaskToList(taskId: string, targetListId: string): Promise<Result<Task>>;

  deleteTask(taskId: string, listId?: string): Promise<Result<void>>;
  clearCompletedTasks(listId: string): Promise<Result<void>>;

  toggleTaskCompletion(
    taskId: string,
    listId?: string,
    targetCompleted?: boolean
  ): Promise<Result<Task>>;

  moveTaskPosition(
    listId: string,
    taskId: string,
    options: { parent?: string; previous?: string; destinationTasklist?: string }
  ): Promise<Result<Task>>;

  addSubtask(taskId: string, title: string): Promise<Result<Task>>;
  toggleSubtaskCompletion(
    taskId: string,
    subtaskId: string,
    listId?: string,
    targetCompleted?: boolean
  ): Promise<Result<Task>>;
  deleteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>>;
  promoteSubtask(taskId: string, subtaskId: string): Promise<Result<Task>>;
}

