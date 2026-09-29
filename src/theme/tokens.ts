import { ThemeColors } from '../contracts/theme.types';

export const darkThemeColors: Readonly<ThemeColors> = Object.freeze({
  surface: '#1b1b1b',
  surfaceDim: '#141414',
  surfaceBright: '#37393b',
  surfaceContainerLowest: '#0e0e0f',
  surfaceContainerLow: '#161616',
  surfaceContainer: '#131314',
  surfaceContainerHigh: '#2d2f31',
  surfaceContainerHighest: '#37393b',

  onSurface: '#e3e3e3',
  onSurfaceVariant: '#c4c7c5',
  outline: '#8e918f',
  outlineVariant: '#444746',

  primary: '#7fcfff',
  onPrimary: '#003366',
  primaryContainer: '#004a77',
  onPrimaryContainer: '#7fcfff',

  secondary: '#c2c7cf',
  onSecondary: '#2d3137',
  secondaryContainer: '#44474e',
  onSecondaryContainer: '#e0e2ec',

  tertiary: '#d4bbff',
  onTertiary: '#3b1c71',
  tertiaryContainer: '#523689',
  onTertiaryContainer: '#eddcff',

  error: '#f28b82',
  onError: '#601410',
  errorContainer: '#8c1d18',
  onErrorContainer: '#f9dedc',

  star: '#fcc408',
  success: '#81c995',
  overdue: '#f28b82',
  important: '#7fcfff',
  inverseSurface: '#e3e3e3',
  inverseOnSurface: '#131314',
  scrim: '#000000',
});

export const lightThemeColors: Readonly<ThemeColors> = Object.freeze({
  surface: '#f8fafd',
  surfaceDim: '#d9dce1',
  surfaceBright: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4f8',
  surfaceContainer: '#ffffff',
  surfaceContainerHigh: '#e9eef6',
  surfaceContainerHighest: '#e1e3e1',

  onSurface: '#1f1f1f',
  onSurfaceVariant: '#444746',
  outline: '#747775',
  outlineVariant: '#c4c7c5',

  primary: '#0b57d0',
  onPrimary: '#ffffff',
  primaryContainer: '#c2e7ff',
  onPrimaryContainer: '#001d35',

  secondary: '#595e67',
  onSecondary: '#ffffff',
  secondaryContainer: '#dde3eb',
  onSecondaryContainer: '#161c24',

  tertiary: '#685499',
  onTertiary: '#ffffff',
  tertiaryContainer: '#eddcff',
  onTertiaryContainer: '#220051',

  error: '#b3261e',
  onError: '#ffffff',
  errorContainer: '#f9dedc',
  onErrorContainer: '#410e0b',

  star: '#fbbc04',
  success: '#1e8e3e',
  overdue: '#b3261e',
  important: '#1a73e8',
  inverseSurface: '#131314',
  inverseOnSurface: '#e3e3e3',
  scrim: '#000000',
});

// Helper mapping for programmatic consumption
export const themeTokens = Object.freeze({
  dark: darkThemeColors,
  light: lightThemeColors,
});

/**
 * Converts a 6-digit or 3-digit hex string into "R G B" space-separated channels
 * for CSS variables with alpha-value composition.
 */
export function hexToRgbChannels(hex: string): string {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleaned.substring(0, 2), 16) || 0;
  const g = parseInt(cleaned.substring(2, 4), 16) || 0;
  const b = parseInt(cleaned.substring(4, 6), 16) || 0;
  return `${r} ${g} ${b}`;
}

/**
 * Key mapping of theme color properties to Material 3 CSS variable names
 */
export const themeCssVariableMap: Record<keyof ThemeColors, string> = Object.freeze({
  surface: '--md-sys-color-surface',
  surfaceDim: '--md-sys-color-surface-dim',
  surfaceBright: '--md-sys-color-surface-bright',
  surfaceContainerLowest: '--md-sys-color-surface-container-lowest',
  surfaceContainerLow: '--md-sys-color-surface-container-low',
  surfaceContainer: '--md-sys-color-surface-container',
  surfaceContainerHigh: '--md-sys-color-surface-container-high',
  surfaceContainerHighest: '--md-sys-color-surface-container-highest',

  onSurface: '--md-sys-color-on-surface',
  onSurfaceVariant: '--md-sys-color-on-surface-variant',
  outline: '--md-sys-color-outline',
  outlineVariant: '--md-sys-color-outline-variant',

  primary: '--md-sys-color-primary',
  onPrimary: '--md-sys-color-on-primary',
  primaryContainer: '--md-sys-color-primary-container',
  onPrimaryContainer: '--md-sys-color-on-primary-container',

  secondary: '--md-sys-color-secondary',
  onSecondary: '--md-sys-color-on-secondary',
  secondaryContainer: '--md-sys-color-secondary-container',
  onSecondaryContainer: '--md-sys-color-on-secondary-container',

  tertiary: '--md-sys-color-tertiary',
  onTertiary: '--md-sys-color-on-tertiary',
  tertiaryContainer: '--md-sys-color-tertiary-container',
  onTertiaryContainer: '--md-sys-color-on-tertiary-container',

  error: '--md-sys-color-error',
  onError: '--md-sys-color-on-error',
  errorContainer: '--md-sys-color-error-container',
  onErrorContainer: '--md-sys-color-on-error-container',

  star: '--md-sys-color-star',
  success: '--md-sys-color-success',
  overdue: '--md-sys-color-overdue',
  important: '--md-sys-color-important',
  inverseSurface: '--md-sys-color-inverse-surface',
  inverseOnSurface: '--md-sys-color-inverse-on-surface',
  scrim: '--md-sys-color-scrim',
});
