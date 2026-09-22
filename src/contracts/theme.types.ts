export type ThemeMode = 'dark' | 'light' | 'system';

export type FontSizeLevel = 'small' | 'normal' | 'large';

export type FontScale = 'sm' | 'md' | 'lg' | 'xl';

export interface ThemePreferencesState {
  themeMode: ThemeMode;
  effectiveTheme: 'dark' | 'light';
  fontSizeLevel: FontSizeLevel;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSizeLevel: (level: FontSizeLevel) => void;
  initTheme: () => void;
}

export interface ThemeColors {
  // Surfaces
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  // Content / On-surface
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;

  // Primary
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Feedback & Status
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // App & Semantic Accents
  star: string;
  success: string;
  overdue: string;
  important: string;
}

export interface ThemeRgbValues {
  [key: string]: string; // "R G B" format for CSS variable opacity composition
}
