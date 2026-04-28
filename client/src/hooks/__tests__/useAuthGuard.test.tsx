/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthGuard } from '../useAuthGuard';

// --- mocks --------------------------------------------------------------
//
// vi.mock is hoisted, so the factory cannot reference top-level locals
// directly. Use vi.hoisted() to lift the spies + state alongside it.

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  logout: vi.fn(),
  apiLogout: vi.fn(),
  state: {
    user: null as { id: string; adSoyad: string; rol: string | null } | null,
    isLoading: false,
    error: null as unknown,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({ ...mocks.state, logout: mocks.logout }),
}));

vi.mock('../../utils/api', () => ({
  SecureAPI: { logout: mocks.apiLogout },
}));

const navigate = mocks.navigate;
const logout = mocks.logout;
const apiLogout = mocks.apiLogout;
const setAuthState = (next: typeof mocks.state) => {
  mocks.state.user = next.user;
  mocks.state.isLoading = next.isLoading;
  mocks.state.error = next.error;
};

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

// --- tests --------------------------------------------------------------

describe('useAuthGuard', () => {
  beforeEach(() => {
    navigate.mockReset();
    logout.mockReset();
    apiLogout.mockReset();
    setAuthState({ user: null, isLoading: false, error: null });
    // Default location: not /login
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/admin', href: 'http://localhost/admin' },
    });
  });

  it('exposes a loading flag while the AuthContext is still loading', () => {
    setAuthState({ user: null, isLoading: true, error: null });
    const { result } = renderHook(() => useAuthGuard(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('settles isLoading=false and exposes the user once loaded', async () => {
    setAuthState({
      user: { id: '1', adSoyad: 'A', rol: 'admin' },
      isLoading: false,
      error: null,
    });
    const { result } = renderHook(() => useAuthGuard(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.id).toBe('1');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects to /login when there is no user and we are not on /login', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/admin', href: 'http://localhost/admin' },
    });
    setAuthState({ user: null, isLoading: false, error: null });
    renderHook(() => useAuthGuard(['admin']), { wrapper });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { replace: true }));
  });

  it('does NOT re-redirect when the path already contains "login"', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/login', href: 'http://localhost/login' },
    });
    setAuthState({ user: null, isLoading: false, error: null });
    const { result } = renderHook(() => useAuthGuard(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('lets a user with an allowed role through without redirecting', async () => {
    setAuthState({
      user: { id: '1', adSoyad: 'A', rol: 'admin' },
      isLoading: false,
      error: null,
    });
    renderHook(() => useAuthGuard(['admin', 'teacher']), { wrapper });
    await waitFor(() => expect(navigate).not.toHaveBeenCalled());
  });

  it('redirects to /<role> when the user is logged in but lacks the required role', async () => {
    setAuthState({
      user: { id: '1', adSoyad: 'S', rol: 'student' },
      isLoading: false,
      error: null,
    });
    renderHook(() => useAuthGuard(['admin']), { wrapper });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/student', { replace: true }));
  });

  it('does NOT enforce role checks when allowedRoles is empty', async () => {
    setAuthState({
      user: { id: '1', adSoyad: 'X', rol: 'parent' },
      isLoading: false,
      error: null,
    });
    renderHook(() => useAuthGuard(), { wrapper });
    await waitFor(() => expect(navigate).not.toHaveBeenCalled());
  });

  it('logout() calls the API, the context logout, and navigates to /login', async () => {
    setAuthState({
      user: { id: '1', adSoyad: 'A', rol: 'admin' },
      isLoading: false,
      error: null,
    });
    apiLogout.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuthGuard(['admin']), { wrapper });
    await act(async () => {
      await result.current.logout();
    });
    expect(apiLogout).toHaveBeenCalled();
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('logout() still calls context logout + navigate even when the API call rejects', async () => {
    setAuthState({
      user: { id: '1', adSoyad: 'A', rol: 'admin' },
      isLoading: false,
      error: null,
    });
    apiLogout.mockRejectedValueOnce(new Error('network fail'));
    // Silence the console.error this case logs.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAuthGuard(['admin']), { wrapper });
    await act(async () => {
      await result.current.logout();
    });
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
    errSpy.mockRestore();
  });
});
