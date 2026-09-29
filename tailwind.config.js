/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        m3: {
          surface: 'rgb(var(--md-sys-color-surface) / <alpha-value>)',
          'surface-dim': 'rgb(var(--md-sys-color-surface-dim) / <alpha-value>)',
          'surface-bright': 'rgb(var(--md-sys-color-surface-bright) / <alpha-value>)',
          'surface-container-lowest': 'rgb(var(--md-sys-color-surface-container-lowest) / <alpha-value>)',
          'surface-container-low': 'rgb(var(--md-sys-color-surface-container-low) / <alpha-value>)',
          'surface-container': 'rgb(var(--md-sys-color-surface-container) / <alpha-value>)',
          'surface-container-high': 'rgb(var(--md-sys-color-surface-container-high) / <alpha-value>)',
          'surface-container-highest': 'rgb(var(--md-sys-color-surface-container-highest) / <alpha-value>)',
          'on-surface': 'rgb(var(--md-sys-color-on-surface) / <alpha-value>)',
          'on-surface-variant': 'rgb(var(--md-sys-color-on-surface-variant) / <alpha-value>)',
          
          primary: 'rgb(var(--md-sys-color-primary) / <alpha-value>)',
          'on-primary': 'rgb(var(--md-sys-color-on-primary) / <alpha-value>)',
          'primary-container': 'rgb(var(--md-sys-color-primary-container) / <alpha-value>)',
          'on-primary-container': 'rgb(var(--md-sys-color-on-primary-container) / <alpha-value>)',

          secondary: 'rgb(var(--md-sys-color-secondary) / <alpha-value>)',
          'on-secondary': 'rgb(var(--md-sys-color-on-secondary) / <alpha-value>)',
          'secondary-container': 'rgb(var(--md-sys-color-secondary-container) / <alpha-value>)',
          'on-secondary-container': 'rgb(var(--md-sys-color-on-secondary-container) / <alpha-value>)',

          tertiary: 'rgb(var(--md-sys-color-tertiary) / <alpha-value>)',
          'on-tertiary': 'rgb(var(--md-sys-color-on-tertiary) / <alpha-value>)',
          'tertiary-container': 'rgb(var(--md-sys-color-tertiary-container) / <alpha-value>)',
          'on-tertiary-container': 'rgb(var(--md-sys-color-on-tertiary-container) / <alpha-value>)',

          error: 'rgb(var(--md-sys-color-error) / <alpha-value>)',
          'on-error': 'rgb(var(--md-sys-color-on-error) / <alpha-value>)',
          'error-container': 'rgb(var(--md-sys-color-error-container) / <alpha-value>)',
          'on-error-container': 'rgb(var(--md-sys-color-on-error-container) / <alpha-value>)',

          outline: 'rgb(var(--md-sys-color-outline) / <alpha-value>)',
          'outline-variant': 'rgb(var(--md-sys-color-outline-variant) / <alpha-value>)',
          'outline-dim': 'rgb(var(--md-sys-color-outline-variant) / 0.3)',
          
          // Highlights & Semantics
          important: 'rgb(var(--md-sys-color-important) / <alpha-value>)',
          star: 'rgb(var(--md-sys-color-star) / <alpha-value>)',
          'star-active': 'rgb(var(--md-sys-color-star) / <alpha-value>)',
          success: 'rgb(var(--md-sys-color-success) / <alpha-value>)',
          overdue: 'rgb(var(--md-sys-color-overdue) / <alpha-value>)',
          'inverse-surface': 'rgb(var(--md-sys-color-inverse-surface) / <alpha-value>)',
          'inverse-on-surface': 'rgb(var(--md-sys-color-inverse-on-surface) / <alpha-value>)',
          scrim: 'rgb(var(--md-sys-color-scrim) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Google Sans Text"', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'm3-xs': '4px',
        'm3-sm': '8px',
        'm3-md': '12px',
        'm3-lg': '16px',
        'm3-xl': '20px',
        'm3-2xl': '24px',
        'm3-3xl': '28px',
      },
      boxShadow: {
        'm3-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
        'm3-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
        'm3-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
};
