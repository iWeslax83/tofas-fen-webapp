/**
 * Soft Modern design tokens — single source of truth (TypeScript).
 * Mirrored in src/styles/tokens.css (parity verified by test).
 */

export const lightPalette = {
  paper: '#faf8f4',
  surface: '#ffffff',
  surface2: '#f4f1ea',
  ink: '#221f1a',
  ink2: '#5c564b',
  inkDim: '#918a7c',
  inkDim2: '#918a7c',
  rule: '#e7e2d8',
  rule2: '#d9d3c4',
} as const;

export const darkPalette = {
  paper: '#1b1916',
  surface: '#242119',
  surface2: '#2c2820',
  ink: '#f1ede4',
  ink2: '#b5aea0',
  inkDim: '#837c6e',
  inkDim2: '#837c6e',
  rule: '#3a352b',
  rule2: '#4a4536',
} as const;

export const fontFamily = {
  sans: ["'Source Sans 3'", 'system-ui', '-apple-system', "'Segoe UI'", 'sans-serif'],
  serif: ["'Source Serif 4'", 'Georgia', "'Times New Roman'", 'serif'],
  mono: [
    'ui-monospace',
    "'SF Mono'",
    "'Cascadia Code'",
    "'Roboto Mono'",
    'Menlo',
    'Consolas',
    'monospace',
  ],
} as const;

export const tokens = {
  light: lightPalette,
  dark: darkPalette,
  fontFamily,
} as const;

export type Palette = typeof lightPalette;
export type Theme = 'light' | 'dark';
