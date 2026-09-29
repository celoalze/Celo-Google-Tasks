import { Task } from '../contracts/tasks.types';
import { Result, success } from '../contracts/api.types';
import { parseDueDate } from './dateUtils';

/** @effectful — scheduler com I/O (localStorage, Notification, electronAPI, timers). Não é função pura. */

const STORAGE_KEY = 'google_tasks_notified_reminders';
const SNOOZE_KEY = 'google_tasks_snoozed_tasks';
const NOTIFICATIONS_ENABLED_KEY = 'google_tasks_notifications_enabled';

// In-memory caches to prevent synchronous localStorage disk I/O every 15s interval
let remindersCache: Record<string, number> | null = null;
let snoozedCache: Record<string, number> | null = null;
let notificationsEnabledCache: boolean | null = null;

/**
 * Returns true if desktop notifications are enabled.
 * Defaults to true if no preference is saved yet.
 */
export function areNotificationsEnabled(): boolean {
  if (notificationsEnabledCache !== null) {
    return notificationsEnabledCache;
  }
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    notificationsEnabledCache = raw === null ? true : raw === 'true';
    return notificationsEnabledCache;
  } catch {
    notificationsEnabledCache = true;
    return true;
  }
}

/**
 * Persists the user preference for desktop notifications.
 */
export function setNotificationsEnabled(enabled: boolean) {
  notificationsEnabledCache = enabled;
  try {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  } catch {}
}

function getStoredReminders(): Record<string, number> {
  if (remindersCache !== null) {
    return remindersCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    remindersCache = raw ? JSON.parse(raw) : {};
    return remindersCache!;
  } catch {
    remindersCache = {};
    return remindersCache;
  }
}

function saveStoredReminders(record: Record<string, number>) {
  // Prune entries older than 48 hours
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const pruned: Record<string, number> = {};
  for (const [key, timestamp] of Object.entries(record)) {
    if (timestamp > cutoff) {
      pruned[key] = timestamp;
    }
  }
  remindersCache = pruned;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

function getStoredSnoozed(): Record<string, number> {
  if (snoozedCache !== null) {
    return snoozedCache;
  }
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    snoozedCache = raw ? JSON.parse(raw) : {};
    return snoozedCache!;
  } catch {
    snoozedCache = {};
    return snoozedCache;
  }
}

function saveStoredSnoozed(record: Record<string, number>) {
  // Prune expirados + teto de 500 entradas para evitar crescimento ilimitado
  const now = Date.now();
  const pruned: Record<string, number> = {};
  for (const [key, until] of Object.entries(record)) {
    if (until > now - 48 * 60 * 60 * 1000) pruned[key] = until;
  }
  const keys = Object.keys(pruned);
  if (keys.length > 500) {
    keys.slice(0, keys.length - 500).forEach((k) => delete pruned[k]);
  }
  snoozedCache = pruned;
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(pruned));
  } catch {}
}

export function invalidateNotificationCaches(): void {
  remindersCache = null;
  snoozedCache = null;
  notificationsEnabledCache = null;
}

if (typeof window !== 'undefined') {
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === SNOOZE_KEY || e.key === NOTIFICATIONS_ENABLED_KEY) {
        invalidateNotificationCaches();
      }
    });
  } catch {}
}

/**
 * Snoozes a task reminder by the specified number of minutes (defaults to 15).
 */
export function snoozeTask(taskId: string, minutes: number = 15) {
  const snoozedUntil = Date.now() + minutes * 60 * 1000;
  const snoozed = getStoredSnoozed();
  snoozed[taskId] = snoozedUntil;
  saveStoredSnoozed(snoozed);

  // Clear existing notification locks for this task so it triggers again after snooze
  const notifiedMap = getStoredReminders();
  for (const key of Object.keys(notifiedMap)) {
    if (key.startsWith(`${taskId}:`)) {
      delete notifiedMap[key];
    }
  }
  saveStoredReminders(notifiedMap);
}

/**
 * Checks all active tasks and triggers native desktop notifications for any task
 * whose scheduled due date/time has arrived.
 */
export function checkTaskReminders(tasks: Task[]) {
  // If user disabled desktop notifications in settings, do not trigger
  if (!areNotificationsEnabled()) {
    return;
  }

  const now = new Date();
  const currentTimestamp = now.getTime();
  const notifiedMap = getStoredReminders();
  const snoozedMap = getStoredSnoozed();
  let hasNewNotifications = false;

  for (const task of tasks) {
    // Ignore completed tasks or tasks without a due date
    if (task.completed || !task.due) continue;

    // Check if task is currently snoozed
    if (snoozedMap[task.id]) {
      if (currentTimestamp < snoozedMap[task.id]) {
        // Still snoozed, skip notification
        continue;
      } else {
        // Snooze expired!
        delete snoozedMap[task.id];
        saveStoredSnoozed(snoozedMap);
      }
    }

    const dueDate = parseDueDate(task.due);
    if (!dueDate) continue;

    if (task.time && !task.isAllDay) {
      const parts = task.time.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        dueDate.setHours(parts[0], parts[1], 0, 0);
      } else {
        dueDate.setHours(9, 0, 0, 0);
      }
    } else {
      // Default to 09:00 for all-day tasks
      dueDate.setHours(9, 0, 0, 0);
    }

    const reminderTime = dueDate.getTime();
    const diffMs = currentTimestamp - reminderTime;

    // Trigger if the scheduled time has arrived (within 24 hours) and has not been notified yet
    if (diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000) {
      const reminderKey = `${task.id}:${task.due}:${task.time || 'allday'}`;

      if (!notifiedMap[reminderKey]) {
        notifiedMap[reminderKey] = currentTimestamp;
        hasNewNotifications = true;

        const body = task.notes && task.notes.trim()
          ? task.notes.trim().slice(0, 100)
          : (task.time && !task.isAllDay ? `Lembrete agendado para ${task.time}` : 'Vence hoje');

        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification({
            title: task.title,
            body,
            taskId: task.id,
          });
        } else if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(task.title, { body });
        }
      }
    }
  }

  if (hasNewNotifications) {
    saveStoredReminders(notifiedMap);
  }
}

/**
 * Starts a background timer that checks tasks every 15 seconds.
 * Returns an unsubscribe/cleanup function.
 */
export function startNotificationScheduler(getTasks: () => Task[]): () => void {
  // Initial check
  checkTaskReminders(getTasks());

  // Check every 15 seconds
  const intervalId = setInterval(() => {
    checkTaskReminders(getTasks());
  }, 15000);

  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Triggers an immediate test desktop notification so the user can verify
 * Windows toasts and sound.
 */
export async function testDesktopNotification(): Promise<Result<void>> {
  if (window.electronAPI?.testNotification) {
    const res = await window.electronAPI.testNotification();
    if (res.ok) return success(undefined as void);
    return { ok: false as const, error: res.error || 'Falha ao testar notificação' };
  }

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Google Tasks Desktop', {
        body: 'Notificações ativas! Você receberá lembretes das suas tarefas.',
      });
      return success(undefined as void);
    }

    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('Google Tasks Desktop', {
        body: 'Notificações ativas! Você receberá lembretes das suas tarefas.',
      });
      return success(undefined as void);
    }
    return { ok: false, error: 'Permissão de notificação negada no navegador' };
  }

  return { ok: false, error: 'Notificações não são suportadas neste ambiente' };
}
