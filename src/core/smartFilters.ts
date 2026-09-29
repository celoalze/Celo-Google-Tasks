import { Task, TaskList, TaskGroup, SmartFilterType } from '../contracts/tasks.types';
import { parseDueDate } from './dateUtils';

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isSameDay(a: Date | null, b: Date): boolean {
  return !!a && a.getTime() === b.getTime();
}

/**
 * Filter tasks according to the active smart list or real Google list ID.
 * `now` injetável para testes determinísticos.
 */
export function filterTasks(
  tasks: readonly Task[],
  activeFilter: SmartFilterType | string,
  searchQuery = '',
  now: Date = new Date()
): readonly Task[] {
  let filtered = tasks;

  // Search filter (lowercase uma vez)
  const q = searchQuery.toLowerCase().trim();
  if (q.length > 0) {
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.notes ? t.notes.toLowerCase().includes(q) : false)
    );
  }

  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // List / Smart filter strictly using Google Tasks official fields
  switch (activeFilter) {
    case 'starred':
      return filtered.filter((t) => !t.completed && !!t.starred);
    case 'today': {
      return filtered.filter((t) => {
        if (t.completed) return false;
        return isSameDay(parseDueDate(t.due), today);
      });
    }
    case 'tomorrow': {
      return filtered.filter((t) => {
        if (t.completed) return false;
        return isSameDay(parseDueDate(t.due), tomorrow);
      });
    }
    case 'overdue': {
      return filtered.filter((t) => {
        if (t.completed || !t.due) return false;
        const d = parseDueDate(t.due);
        return !!d && d.getTime() < today.getTime();
      });
    }
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
 * Parse de due uma única vez por task (antes: 3x parse por task).
 */
export function calculateCounts(
  tasks: readonly Task[],
  lists: readonly TaskList[],
  now: Date = new Date()
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

  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  tasks.forEach((t) => {
    if (t.completed) {
      smartCounts.completed += 1;
    } else {
      smartCounts.all += 1;

      if (t.starred) {
        smartCounts.starred += 1;
      }
      const due = parseDueDate(t.due);
      if (due) {
        if (due.getTime() === today.getTime()) smartCounts.today += 1;
        if (due.getTime() === tomorrow.getTime()) smartCounts.tomorrow += 1;
        if (due.getTime() < today.getTime()) smartCounts.overdue += 1;
      }
      if (listCounts[t.listId] !== undefined) {
        listCounts[t.listId] += 1;
      }
    }
  });

  return { smartCounts, listCounts };
}
