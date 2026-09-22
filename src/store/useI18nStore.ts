import { create } from 'zustand';
import { SupportedLocale, LanguagePreference } from '../contracts/i18n.types';
import { detectSystemLocale, translate } from '../i18n';

const LANGUAGE_STORAGE_KEY = 'google_tasks_language_preference';

export interface I18nState {
  preference: LanguagePreference;
  locale: SupportedLocale;
  setLanguagePreference: (preference: LanguagePreference) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  initI18n: () => void;
}

function getStoredPreference(): LanguagePreference {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguagePreference | null;
  if (saved === 'system' || saved === 'en' || saved === 'pt-BR' || saved === 'es') {
    return saved;
  }
  return 'system';
}

export const useI18nStore = create<I18nState>((set, get) => ({
  preference: 'system',
  locale: 'en',

  setLanguagePreference: (preference: LanguagePreference) => {
    const locale = preference === 'system' ? detectSystemLocale() : preference;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
    }
    set({ preference, locale });
  },

  t: (path: string, params?: Record<string, string | number>) => {
    const { locale } = get();
    return translate(locale, path, params);
  },

  initI18n: () => {
    const preference = getStoredPreference();
    const locale = preference === 'system' ? detectSystemLocale() : preference;
    set({ preference, locale });
  },
}));
