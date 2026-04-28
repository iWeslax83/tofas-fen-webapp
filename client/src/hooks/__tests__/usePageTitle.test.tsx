/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from '../usePageTitle';

describe('usePageTitle', () => {
  beforeEach(() => {
    document.title = 'baseline';
  });

  it('sets document.title to "<title> · Tofaş Fen Lisesi" by default', () => {
    renderHook(() => usePageTitle('Notlar'));
    expect(document.title).toBe('Notlar · Tofaş Fen Lisesi');
  });

  it('honours an empty suffix to use the bare title', () => {
    renderHook(() => usePageTitle('Giriş', { suffix: '' }));
    expect(document.title).toBe('Giriş');
  });

  it('honours a custom suffix', () => {
    renderHook(() => usePageTitle('Ödevler', { suffix: 'TFL' }));
    expect(document.title).toBe('Ödevler · TFL');
  });

  it('honours a custom separator', () => {
    renderHook(() => usePageTitle('Ödevler', { separator: ' — ' }));
    expect(document.title).toBe('Ödevler — Tofaş Fen Lisesi');
  });

  it('restores the previous document.title on unmount', () => {
    document.title = 'before';
    const { unmount } = renderHook(() => usePageTitle('Notlar'));
    expect(document.title).toBe('Notlar · Tofaş Fen Lisesi');
    unmount();
    expect(document.title).toBe('before');
  });

  it('updates document.title when title prop changes', () => {
    const { rerender } = renderHook(({ t }: { t: string }) => usePageTitle(t), {
      initialProps: { t: 'A' },
    });
    expect(document.title).toBe('A · Tofaş Fen Lisesi');
    rerender({ t: 'B' });
    expect(document.title).toBe('B · Tofaş Fen Lisesi');
  });

  it('updates document.title when suffix prop changes', () => {
    const { rerender } = renderHook(
      ({ s }: { s: string }) => usePageTitle('Notlar', { suffix: s }),
      { initialProps: { s: 'A' } },
    );
    expect(document.title).toBe('Notlar · A');
    rerender({ s: 'B' });
    expect(document.title).toBe('Notlar · B');
  });
});
