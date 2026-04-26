import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lightPalette, darkPalette } from '../tokens';

const tokensCss = readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf8');

function parseBlock(selector: string): Record<string, string> {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`);
  const rawBody = tokensCss.match(re)?.[1] ?? '';
  const body = rawBody.replace(/\/\*[\s\S]*?\*\//g, ''); // strip CSS comments
  const out: Record<string, string> = {};
  for (const decl of body.split(/;\s*/)) {
    const m = decl.trim().match(/^--([a-z0-9-]+)\s*:\s*(.+?)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const cssToTsKey = (cssVar: string): string =>
  cssVar.replace(/-(\d|[a-z])/g, (_, c) => c.toUpperCase());

const PALETTE_KEYS = [
  'paper',
  'surface',
  'surface-2',
  'ink',
  'ink-2',
  'ink-dim',
  'ink-dim-2',
  'rule',
  'rule-2',
  'state',
  'state-deep',
] as const;

describe('design tokens parity', () => {
  const lightCss = parseBlock(':root');
  const darkCss = parseBlock("[data-theme='dark']");

  it('light palette matches tokens.css :root', () => {
    for (const key of PALETTE_KEYS) {
      const tsKey = cssToTsKey(key) as keyof typeof lightPalette;
      expect(lightCss[key], `--${key}`).toBe(lightPalette[tsKey]);
    }
  });

  it('dark palette matches tokens.css [data-theme="dark"]', () => {
    for (const key of PALETTE_KEYS) {
      const tsKey = cssToTsKey(key) as keyof typeof darkPalette;
      expect(darkCss[key], `--${key}`).toBe(darkPalette[tsKey]);
    }
  });
});
