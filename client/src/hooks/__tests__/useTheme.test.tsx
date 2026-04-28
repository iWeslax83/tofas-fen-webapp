/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme';
import { useUIStore } from '../../stores/uiStore';

interface MqlMock {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
}

const buildMql = (matches: boolean): MqlMock => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('useTheme', () => {
  beforeEach(() => {
    // Reset the persisted UI store to its default (system) before each test.
    useUIStore.setState({ theme: 'system' });
    // Ensure matchMedia is present — the per-test mocks below replace it,
    // but the first test that doesn't override needs the baseline too.
    window.matchMedia = vi.fn().mockImplementation(() => buildMql(false));
  });

  it('reflects the current store theme', () => {
    useUIStore.setState({ theme: 'dark' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('reads the system theme from prefers-color-scheme on mount', () => {
    let mql: MqlMock = buildMql(true);
    window.matchMedia = vi.fn().mockImplementation(() => mql);
    const { result } = renderHook(() => useTheme());
    expect(result.current.systemTheme).toBe('dark');

    mql = buildMql(false);
    window.matchMedia = vi.fn().mockImplementation(() => mql);
    const { result: r2 } = renderHook(() => useTheme());
    expect(r2.current.systemTheme).toBe('light');
  });

  it('resolvedTheme falls back to systemTheme when theme === "system"', () => {
    window.matchMedia = vi.fn().mockImplementation(() => buildMql(true));
    useUIStore.setState({ theme: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('resolvedTheme honours an explicit theme override', () => {
    window.matchMedia = vi.fn().mockImplementation(() => buildMql(true));
    useUIStore.setState({ theme: 'light' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('setTheme writes through to the store', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('subscribes to media-query changes and updates systemTheme', () => {
    const mql = buildMql(false);
    window.matchMedia = vi.fn().mockImplementation(() => mql);
    const { result } = renderHook(() => useTheme());
    expect(result.current.systemTheme).toBe('light');

    // Find the listener that the hook attached and fire a change event.
    const handler = mql.addEventListener.mock.calls.find(([event]) => event === 'change')?.[1] as
      | ((e: { matches: boolean }) => void)
      | undefined;
    expect(handler).toBeTypeOf('function');
    act(() => handler?.({ matches: true }));
    expect(result.current.systemTheme).toBe('dark');
  });

  it('removes the change listener on unmount', () => {
    const mql = buildMql(false);
    window.matchMedia = vi.fn().mockImplementation(() => mql);
    const { unmount } = renderHook(() => useTheme());
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalled();
  });
});
