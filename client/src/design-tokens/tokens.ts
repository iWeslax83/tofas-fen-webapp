/**
 * Devlet design tokens — single source of truth (TypeScript).
 * Mirrored in src/styles/tokens.css (parity verified by test).
 */

export const lightPalette = {
  paper: '#ffffff',
  surface: '#f6f5f1',
  surface2: '#edeae3',
  ink: '#0d0d0d',
  ink2: '#2a2a2a',
  inkDim: '#555555',
  inkDim2: '#8a8a85',
  rule: '#c9c6bc',
  rule2: '#8a8680',
  state: '#931a1a',
  stateDeep: '#6b0e0e',
} as const;

export const darkPalette = {
  paper: '#0a0d12',
  surface: '#121820',
  surface2: '#1a2029',
  ink: '#e7e5df',
  ink2: '#c5c2b8',
  inkDim: '#8c8a82',
  inkDim2: '#5c5a54',
  rule: 'rgba(231, 229, 223, 0.1)',
  rule2: 'rgba(231, 229, 223, 0.22)',
  state: '#c94444',
  stateDeep: '#8b2323',
} as const;

export const fontFamily = {
  sans: ["'IBM Plex Sans'", 'system-ui', '-apple-system', "'Segoe UI'", 'sans-serif'],
  serif: ["'IBM Plex Serif'", 'Georgia', "'Times New Roman'", 'serif'],
  mono: ["'IBM Plex Mono'", 'ui-monospace', "'SF Mono'", 'Menlo', 'monospace'],
} as const;

export const tokens = {
  light: lightPalette,
  dark: darkPalette,
  fontFamily,
} as const;

export type Palette = typeof lightPalette;
export type Theme = 'light' | 'dark';
