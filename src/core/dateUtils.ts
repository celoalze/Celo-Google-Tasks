import { SupportedLocale } from '../contracts/i18n.types';
import { useI18nStore } from '../store/useI18nStore';

function getActiveLocale(overrideLocale?: SupportedLocale): SupportedLocale {
  if (overrideLocale) return overrideLocale;
  try {
    return useI18nStore.getState().locale || 'en';
  } catch {
    return 'en';
  }
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

export const DAYS_SHORT = I18N_DAYS_SHORT['pt-BR'];
export const MONTHS_SHORT = I18N_MONTHS_SHORT['pt-BR'];

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

// Backward-compatible alias
export const formatCompletedAtPtBr = formatCompletedAt;

/**
 * Safely parses a Google Tasks RFC 3339 due string (e.g. "2026-07-10T00:00:00.000Z")
 * into a local Date representing that calendar day at local midnight, preventing timezone shift bugs.
 */
export function parseDueDate(dateString?: string): Date | null {
  if (!dateString) return null;
  const datePart = dateString.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const fallback = new Date(dateString);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
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
 * Checks whether a due date is in the past (overdue) relative to today's local date.
 */
export function isOverdue(dateString?: string): boolean {
  const date = parseDueDate(dateString);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date.getTime() < today.getTime();
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

export const formatFullDatePtBr = formatFullDate;

/**
 * Formats badge on the task card matching official Google Tasks API
 * e.g. "Hoje" / "Amanhã" / "sex., 25 de set." / "ter., 13 de out."
 */
export function formatGoogleTaskBadge(
  dueDate?: string,
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



