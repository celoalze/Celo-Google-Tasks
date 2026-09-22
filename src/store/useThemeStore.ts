import { create } from 'zustand';
import { ThemeMode, FontSizeLevel, ThemePreferencesState } from '../contracts/theme.types';

const THEME_STORAGE_KEY = 'google_tasks_theme_mode';
const FONT_SIZE_STORAGE_KEY = 'google_tasks_font_size';

const FONT_SCALE_MAP: Record<FontSizeLevel, string> = {
  small: '0.875', // 14px base
  normal: '1',    // 16px base (standard)
  large: '1.15',  // 18.4px base
};

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (saved === 'dark' || saved === 'light' || saved === 'system') {
    return saved;
  }
  return 'system';
}

function getStoredFontSize(): FontSizeLevel {
  if (typeof window === 'undefined') return 'normal';
  const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY) as FontSizeLevel | null;
  if (saved === 'small' || saved === 'normal' || saved === 'large') {
    return saved;
  }
  return 'normal';
}

function applyThemeToDom(effective: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (effective === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
}

function applyFontScaleToDom(level: FontSizeLevel) {
  if (typeof document === 'undefined') return;
  const scale = FONT_SCALE_MAP[level] || '1';
  document.documentElement.style.setProperty('--font-scale', scale);
}

let isMediaListenerAttached = false;

export const useThemeStore = create<ThemePreferencesState>((set, get) => ({
  themeMode: 'system',
  effectiveTheme: 'dark',
  fontSizeLevel: 'normal',

  setThemeMode: (mode: ThemeMode) => {
    const effective = mode === 'system' ? getSystemTheme() : mode;
    applyThemeToDom(effective);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    set({ themeMode: mode, effectiveTheme: effective });
  },

  setFontSizeLevel: (level: FontSizeLevel) => {
    applyFontScaleToDom(level);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, level);
    }
    set({ fontSizeLevel: level });
  },

  initTheme: () => {
    const mode = getStoredThemeMode();
    const fontSize = getStoredFontSize();
    const effective = mode === 'system' ? getSystemTheme() : mode;

    applyThemeToDom(effective);
    applyFontScaleToDom(fontSize);

    set({
      themeMode: mode,
      effectiveTheme: effective,
      fontSizeLevel: fontSize,
    });

    if (!isMediaListenerAttached && typeof window !== 'undefined' && window.matchMedia) {
      isMediaListenerAttached = true;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleOsThemeChange = () => {
        if (get().themeMode === 'system') {
          const updatedEffective = getSystemTheme();
          applyThemeToDom(updatedEffective);
          set({ effectiveTheme: updatedEffective });
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleOsThemeChange);
      } else {
        // Fallback for older WebKit / Electron versions
        (mediaQuery as MediaQueryList).addListener(handleOsThemeChange);
      }
    }
  },
}));
