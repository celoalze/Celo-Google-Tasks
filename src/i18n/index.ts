import { SupportedLocale, TranslationSchema } from '../contracts/i18n.types';
import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';
import { es } from './locales/es';

export const locales: Record<SupportedLocale, TranslationSchema> = {
  en,
  'pt-BR': ptBR,
  es,
};

export const FALLBACK_LOCALE: SupportedLocale = 'en';

/**
 * Detects the user's operating system / browser language.
 * Defaults strictly to English ('en') if Portuguese or Spanish are not detected.
 */
export function detectSystemLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return FALLBACK_LOCALE;
  const rawLangs =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || ''];

  for (const lang of rawLangs) {
    if (!lang) continue;
    const lower = lang.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-BR';
    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('en')) return 'en';
  }

  return FALLBACK_LOCALE;
}

/**
 * Resolves a dot-notated translation path (e.g. "nav.allTasks") with optional
 * parameter interpolation ({count}, {sender}, etc.).
 * Falls back to English if the key is missing in the target locale.
 */
export function translate(
  locale: SupportedLocale,
  path: string,
  params?: Record<string, string | number>
): string {
  const dict = locales[locale] || locales[FALLBACK_LOCALE];
  const fallbackDict = locales[FALLBACK_LOCALE];

  const keys = path.split('.');
  let current: any = dict;
  let fallbackCurrent: any = fallbackDict;

  for (const k of keys) {
    current = current?.[k];
    fallbackCurrent = fallbackCurrent?.[k];
  }

  let text = typeof current === 'string' ? current : typeof fallbackCurrent === 'string' ? fallbackCurrent : path;

  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }
  }

  return text;
}
