export type ThemeMode = 'dark' | 'light' | 'system';

export type FontSizeLevel = 'small' | 'normal' | 'large';

export interface ThemePreferences {
  readonly themeMode: ThemeMode;
  readonly effectiveTheme: 'dark' | 'light';
  readonly fontSizeLevel: FontSizeLevel;
}

export interface ThemeColors {
  // Surfaces
  readonly surface: string;
  readonly surfaceDim: string;
  readonly surfaceBright: string;
  readonly surfaceContainerLowest: string;
  readonly surfaceContainerLow: string;
  readonly surfaceContainer: string;
  readonly surfaceContainerHigh: string;
  readonly surfaceContainerHighest: string;

  // Content / On-surface
  readonly onSurface: string;
  readonly onSurfaceVariant: string;
  readonly outline: string;
  readonly outlineVariant: string;

  // Primary
  readonly primary: string;
  readonly onPrimary: string;
  readonly primaryContainer: string;
  readonly onPrimaryContainer: string;

  // Secondary
  readonly secondary: string;
  readonly onSecondary: string;
  readonly secondaryContainer: string;
  readonly onSecondaryContainer: string;

  // Tertiary
  readonly tertiary: string;
  readonly onTertiary: string;
  readonly tertiaryContainer: string;
  readonly onTertiaryContainer: string;

  // Feedback & Status
  readonly error: string;
  readonly onError: string;
  readonly errorContainer: string;
  readonly onErrorContainer: string;

  // App & Semantic Accents
  readonly star: string;
  readonly success: string;
  readonly overdue: string;
  readonly important: string;
  readonly inverseSurface: string;
  readonly inverseOnSurface: string;
  readonly scrim: string;
}

export interface ThemeRgbValues {
  readonly [key: string]: string; // "R G B" format for CSS variable opacity composition
}
