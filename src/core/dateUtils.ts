import { SupportedLocale } from '../contracts/i18n.types';

/**
 * Pure locale resolution (sem importar store — evita ciclo core→store).
 * Lê preferência persistida + navigator, com fallback.
 */
function getActiveLocale(overrideLocale?: SupportedLocale): SupportedLocale {
  if (overrideLocale) return overrideLocale;
  try {
    if (typeof localStorage !== 'undefined') {
      const pref = localStorage.getItem('google_tasks_language_preference');
      if (pref === 'en' || pref === 'pt-BR' || pref === 'es') return pref;
    }
    if (typeof navigator !== 'undefined') {
      const lang = navigator.language || 'en';
      if (lang.startsWith('pt')) return 'pt-BR';
      if (lang.startsWith('es')) return 'es';
      return 'en';
    }
  } catch {
    // ignore
  }
  return 'pt-BR';
}

const I18N_DAYS_SHORT: Record<SupportedLocale, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'pt-BR': ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'],
  es: ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'],
};

const I18N_MONTHS_SHORT: Record<SupportedLocale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  'pt-BR': ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'],
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'],
};

const I18N_MONTHS_FULL: Record<SupportedLocale, string[]> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  'pt-BR': [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ],
  es: [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ],
};

const I18N_RELATIVE_WORDS: Record<SupportedLocale, { today: string; tomorrow: string; yesterday: string }> = {
  en: { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday' },
  'pt-BR': { today: 'Hoje', tomorrow: 'Amanhã', yesterday: 'Ontem' },
  es: { today: 'Hoy', tomorrow: 'Mañana', yesterday: 'Ayer' },
};

export function formatCompletedAt(
  completedAt?: string,
  updatedAt?: string,
  locale?: SupportedLocale
): string {
  const target = completedAt || updatedAt;
  if (!target) return '';
  const l = getActiveLocale(locale);
  try {
    const d = new Date(target);
    const dayName = I18N_DAYS_SHORT[l][d.getDay()] || '';
    const day = d.getDate();
    const month = I18N_MONTHS_SHORT[l][d.getMonth()]?.replace('.', '') || '';

    if (l === 'en') {
      return `Completed on: ${dayName}, ${month} ${day}.`;
    }
    if (l === 'es') {
      return `Completada el: ${dayName}, ${day} de ${month}.`;
    }
    return `Concluída em: ${dayName}, ${day} de ${month}.`;
  } catch {
    return '';
  }
}

/**
 * Safely parses a Google Tasks RFC 3339 due string (e.g. "2026-07-10T00:00:00.000Z")
 * into a local Date representing that calendar day at local midnight, preventing timezone shift bugs.
 * Retorna null para formato inválido (sem fallback com TZ-shift).
 */
export function parseDueDate(dateString?: string): Date | null {
  if (!dateString) return null;
  const datePart = dateString.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || !Number.isInteger(parts[0]) || !Number.isInteger(parts[1]) || !Number.isInteger(parts[2])) {
    return null;
  }
  const [y, m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Converts a Date object or "YYYY-MM-DD" string to the official Google Tasks RFC 3339 UTC timestamp.
 * e.g. "2026-07-10T00:00:00.000Z"
 */
export function toGoogleDueIso(dateInput: Date | string): string {
  if (typeof dateInput === 'string') {
    const cleanDate = dateInput.split('T')[0];
    return `${cleanDate}T00:00:00.000Z`;
  }
  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

/**
 * Formats date matching clean Microsoft To Do / Material 3 style:
 * e.g. "Hoje" / "Today" / "Hoy", "sex., 10 de jul." / "Fri, Jul 10"
 */
export function formatDueDate(dateString?: string, locale?: SupportedLocale): string | null {
  const date = parseDueDate(dateString);
  if (!date) return null;
  const l = getActiveLocale(locale);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateTime = date.getTime();
  if (dateTime === today.getTime()) {
    return I18N_RELATIVE_WORDS[l].today;
  }
  if (dateTime === tomorrow.getTime()) {
    return I18N_RELATIVE_WORDS[l].tomorrow;
  }
  if (dateTime === yesterday.getTime()) {
    return I18N_RELATIVE_WORDS[l].yesterday;
  }

  const dayOfWeek = I18N_DAYS_SHORT[l][date.getDay()];
  const day = date.getDate();
  const month = I18N_MONTHS_SHORT[l][date.getMonth()];
  const currentYear = today.getFullYear();

  if (l === 'en') {
    if (date.getFullYear() !== currentYear) {
      return `${dayOfWeek}, ${month} ${day}, ${date.getFullYear()}`;
    }
    return `${dayOfWeek}, ${month} ${day}`;
  }

  if (date.getFullYear() !== currentYear) {
    return `${dayOfWeek}, ${day} de ${month} de ${date.getFullYear()}`;
  }
  return `${dayOfWeek}, ${day} de ${month}`;
}

/**
 * Checks whether a due date is in the past (overdue) relative to today's local date and current time.
 */
export function isOverdue(dateString?: string, timeString?: string): boolean {
  const date = parseDueDate(dateString);
  if (!date) return false;

  const now = new Date();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  if (date.getTime() < todayMidnight.getTime()) {
    return true;
  }

  // If due date is today and time is set, check if current time is past due time
  if (date.getTime() === todayMidnight.getTime()) {
    const effectiveTime = timeString || extractTimeFromIso(dateString);
    if (effectiveTime) {
      const parts = effectiveTime.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const taskDueDateTime = new Date();
        taskDueDateTime.setHours(parts[0], parts[1], 0, 0);
        return now.getTime() > taskDueDateTime.getTime();
      }
    }
  }

  return false;
}

/**
 * Checks whether a due date is today.
 */
export function isToday(dateString?: string): boolean {
  const date = parseDueDate(dateString);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date.getTime() === today.getTime();
}

/**
 * Checks whether a due date is tomorrow.
 */
export function isTomorrow(dateString?: string): boolean {
  const date = parseDueDate(dateString);
  if (!date) return false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return date.getTime() === tomorrow.getTime();
}

/**
 * Preset helpers for quick due date creation (formatted as official Google Tasks RFC 3339 UTC)
 */
export function getTodayIso(): string {
  return toGoogleDueIso(new Date());
}

export function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toGoogleDueIso(d);
}

export function getNextWeekIso(): string {
  const d = new Date();
  const day = d.getDay();
  // Next Monday
  const diff = d.getDate() + ((7 - day + 1) % 7 || 7);
  d.setDate(diff);
  return toGoogleDueIso(d);
}

/**
 * Extracts YYYY-MM-DD from an ISO string for HTML <input type="date">
 */
export function extractDateString(isoString?: string): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

/**
 * Formats date for the Google Tasks Date Chip (e.g. "18 de setembro" / "September 18")
 */
export function formatFullDate(dateInput?: string, locale?: SupportedLocale): string {
  const l = getActiveLocale(locale);
  const defaultLabel = l === 'en' ? 'Set date' : l === 'es' ? 'Definir fecha' : 'Definir data';
  if (!dateInput) return defaultLabel;
  const date = parseDueDate(dateInput);
  if (!date) return defaultLabel;

  const day = date.getDate();
  const month = I18N_MONTHS_FULL[l][date.getMonth()];
  const currentYear = new Date().getFullYear();

  if (l === 'en') {
    if (date.getFullYear() !== currentYear) {
      return `${month} ${day}, ${date.getFullYear()}`;
    }
    return `${month} ${day}`;
  }

  if (date.getFullYear() !== currentYear) {
    return `${day} de ${month} de ${date.getFullYear()}`;
  }
  return `${day} de ${month}`;
}

/**
 * Extracts "HH:mm" from an ISO timestamp if it contains a non-midnight time.
 */
export function extractTimeFromIso(isoString?: string): string | undefined {
  if (!isoString || !isoString.includes('T')) return undefined;
  const timePart = isoString.split('T')[1];
  if (!timePart) return undefined;
  // If time is 00:00:00.000Z or 00:00:00Z, it is normalized midnight from Google API
  if (timePart.startsWith('00:00:00')) return undefined;

  const parts = timePart.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return undefined;
}

/**
 * Formats time string (HH:mm) according to locale (e.g. "14:30" or "2:30 PM").
 */
export function formatTime(timeStr?: string, locale?: SupportedLocale): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const l = getActiveLocale(locale);
  if (l === 'en') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Formats badge on the task card matching official Google Tasks API
 * e.g. "Hoje, 14:30" / "Amanhã" / "sex., 25 de set., 18:00" / "ter., 13 de out."
 */
export function formatGoogleTaskBadge(
  dueDate?: string,
  dueTime?: string,
  locale?: SupportedLocale
): string | null {
  if (!dueDate) return null;
  const date = parseDueDate(dueDate);
  if (!date) return null;
  const l = getActiveLocale(locale);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateTime = date.getTime();
  let baseDate = '';

  if (dateTime === today.getTime()) {
    baseDate = I18N_RELATIVE_WORDS[l].today;
  } else if (dateTime === tomorrow.getTime()) {
    baseDate = I18N_RELATIVE_WORDS[l].tomorrow;
  } else if (dateTime === yesterday.getTime()) {
    baseDate = I18N_RELATIVE_WORDS[l].yesterday;
  } else {
    const dayOfWeek = I18N_DAYS_SHORT[l][date.getDay()];
    const day = date.getDate();
    const month = I18N_MONTHS_SHORT[l][date.getMonth()];
    const currentYear = today.getFullYear();

    if (l === 'en') {
      if (date.getFullYear() !== currentYear) {
        baseDate = `${dayOfWeek}, ${month} ${day}, ${date.getFullYear()}`;
      } else {
        baseDate = `${dayOfWeek}, ${month} ${day}`;
      }
    } else {
      if (date.getFullYear() !== currentYear) {
        baseDate = `${dayOfWeek}, ${day} de ${month} de ${date.getFullYear()}`;
      } else {
        baseDate = `${dayOfWeek}, ${day} de ${month}`;
      }
    }
  }

  const effectiveTime = dueTime || extractTimeFromIso(dueDate);
  if (effectiveTime) {
    const formatted = formatTime(effectiveTime, l);
    return `${baseDate}, ${formatted}`;
  }

  return baseDate;
}

/**
 * Extracts a time string "HH:mm" from text (e.g. notes or title) matching the 00:00 format.
 */
export function extractTimeFromText(text?: string): string | undefined {
  if (!text) return undefined;

  // 1. Check for standalone time line (e.g. "14:30" or "[14:30]")
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const lineMatch = trimmed.match(/^\[?([01]?\d|2[0-3]):([0-5]\d)\]?$/);
    if (lineMatch) {
      return `${lineMatch[1].padStart(2, '0')}:${lineMatch[2]}`;
    }
  }

  // 2. Look for 00:00 pattern surrounded by non-digits
  const match = text.match(/(?:^|[^\d:])([01]?\d|2[0-3]):([0-5]\d)(?=[^\d:]|$)/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  return undefined;
}

/**
 * Returns notes with standalone time line removed for clean display in card previews.
 */
export function getDisplayNotes(notes?: string, _time?: string): string {
  void _time;
  if (!notes) return '';
  const lines = notes.split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    // Filter out standalone time line (e.g. "14:30" or "[14:30]")
    if (trimmed.match(/^\[?([01]?\d|2[0-3]):([0-5]\d)\]?$/)) {
      return false;
    }
    return true;
  });
  return filtered.join('\n').trim();
}

/**
 * Synchronizes the time with the notes field:
 * - If time is specified, ensures the time "HH:mm" is included in notes (on its own line).
 * - If time is undefined, removes any standalone time line from notes.
 */
export function syncTimeToNotes(existingNotes?: string, time?: string): string {
  const notes = (existingNotes || '').trim();

  // If time is cleared/undefined, remove standalone time line
  if (!time) {
    const lines = notes ? notes.split('\n') : [];
    const filtered = lines.filter((line) => !line.trim().match(/^\[?([01]?\d|2[0-3]):([0-5]\d)\]?$/));
    return filtered.join('\n').trim();
  }

  // Evita falso-positivo de substring ("14:30" em "114:300"): verifica linha exata.
  const existingLines = notes ? notes.split('\n') : [];
  if (existingLines.some((line) => line.trim() === time)) return notes;

  const lines = [...existingLines];
  let replaced = false;

  // Replace any existing standalone time line with the new time
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^\[?([01]?\d|2[0-3]):([0-5]\d)\]?$/)) {
      lines[i] = time;
      replaced = true;
      break;
    }
  }

  if (replaced) {
    return lines.join('\n').trim();
  }

  // If there are other notes, prepend time on its own line
  if (notes) {
    return `${time}\n${notes}`;
  }

  // Otherwise, notes is just the time
  return time;
}



