import { Task, TaskList, TaskGroup, SmartFilterType } from '../contracts/tasks.types';
import { isToday, isTomorrow, isOverdue } from './dateUtils';

/**
 * Filter tasks according to the active smart list or real Google list ID.
 */
export function filterTasks(
  tasks: readonly Task[],
  activeFilter: SmartFilterType | string,
  searchQuery: string = ''
): readonly Task[] {
  let filtered = tasks;

  // Search filter
  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    );
  }

  // List / Smart filter strictly using Google Tasks official fields
  switch (activeFilter) {
    case 'starred':
      return filtered.filter((t) => !t.completed && !!t.starred);
    case 'today':
      return filtered.filter((t) => !t.completed && isToday(t.due));
    case 'tomorrow':
      return filtered.filter((t) => !t.completed && isTomorrow(t.due));
    case 'overdue':
      return filtered.filter((t) => !t.completed && isOverdue(t.due));
    case 'all':
      return filtered.filter((t) => !t.completed);
    case 'completed':
      return filtered.filter((t) => t.completed);
    default:
      // Active filter is a real Google list ID
      return filtered.filter((t) => t.listId === activeFilter);
  }
}

/**
 * Groups tasks by their real task list for the "Todas" view.
 */
export function groupTasksByList(
  tasks: readonly Task[],
  lists: readonly TaskList[]
): readonly TaskGroup[] {
  const listMap = new Map<string, TaskList>();
  lists.forEach((l) => listMap.set(l.id, l));

  const groupMap = new Map<string, Task[]>();

  tasks.forEach((t) => {
    const current = groupMap.get(t.listId) || [];
    current.push(t);
    groupMap.set(t.listId, current);
  });

  const groups: TaskGroup[] = [];

  // Maintain the order of the user's real lists
  lists.forEach((list) => {
    const groupTasks = groupMap.get(list.id);
    if (groupTasks && groupTasks.length > 0) {
      groups.push({
        id: list.id,
        title: list.title,
        icon: list.icon || '📋',
        tasks: groupTasks,
      });
    }
  });

  // Any tasks with lists not found in lists array
  groupMap.forEach((gTasks, listId) => {
    if (!listMap.has(listId) && gTasks.length > 0) {
      groups.push({
        id: listId,
        title: 'Tarefas Gerais',
        icon: 'folder',
        tasks: gTasks,
      });
    }
  });

  return groups;
}

/**
 * Calculates badge counts for official smart lists and real custom lists.
 */
export function calculateCounts(
  tasks: readonly Task[],
  lists: readonly TaskList[]
): {
  smartCounts: Record<SmartFilterType, number>;
  listCounts: Record<string, number>;
} {
  const smartCounts: Record<SmartFilterType, number> = {
    all: 0,
    starred: 0,
    today: 0,
    tomorrow: 0,
    overdue: 0,
    completed: 0,
  };

  const listCounts: Record<string, number> = {};
  lists.forEach((l) => {
    listCounts[l.id] = 0;
  });

  tasks.forEach((t) => {
    if (t.completed) {
      smartCounts.completed += 1;
    } else {
      smartCounts.all += 1;

      if (t.starred) {
        smartCounts.starred += 1;
      }
      if (isToday(t.due)) {
        smartCounts.today += 1;
      }
      if (isTomorrow(t.due)) {
        smartCounts.tomorrow += 1;
      }
      if (isOverdue(t.due)) {
        smartCounts.overdue += 1;
      }
      if (listCounts[t.listId] !== undefined) {
        listCounts[t.listId] += 1;
      }
    }
  });

  return { smartCounts, listCounts };
}
