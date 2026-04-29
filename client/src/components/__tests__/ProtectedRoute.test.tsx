/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const authState = vi.hoisted(() => ({
  user: null as { rol?: string } | null,
  isLoading: false,
  initialized: true,
}));

// Selector-aware mock: useAuthStore takes a selector, so the mock has to
// invoke it against the current state object.
vi.mock('../../stores/authStore', () => ({
  useAuthStore: <T,>(selector: (state: typeof authState) => T) => selector(authState),
}));

import ProtectedRoute from '../ProtectedRoute';

const renderRoute = (ui: React.ReactElement, initialEntry = '/protected') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/login" element={<div>LOGIN_SCREEN</div>} />
        <Route path="/admin" element={<div>ADMIN_SCREEN</div>} />
        <Route path="/student" element={<div>STUDENT_SCREEN</div>} />
        <Route path="/teacher" element={<div>TEACHER_SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isLoading = false;
    authState.initialized = true;
  });

  it('shows the spinner while not initialized', () => {
    authState.initialized = false;
    renderRoute(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>SECRET</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).toBeNull();
  });

  it('shows the spinner while isLoading is true (even after initialization)', () => {
    authState.isLoading = true;
    renderRoute(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>SECRET</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('redirects to /login when there is no user', () => {
    renderRoute(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>SECRET</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('LOGIN_SCREEN')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).toBeNull();
  });

  it('renders the children when the user role is allowed', () => {
    authState.user = { rol: 'admin' };
    renderRoute(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>SECRET</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });

  it('redirects an authorised user with the wrong role to their own dashboard', () => {
    authState.user = { rol: 'student' };
    renderRoute(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>SECRET</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('STUDENT_SCREEN')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).toBeNull();
  });

  it('falls back to /<empty-role> when the user has no rol field', () => {
    authState.user = {};
    renderRoute(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>SECRET</div>
      </ProtectedRoute>,
    );
    expect(screen.queryByText('SECRET')).toBeNull();
  });

  it('renders children when role is one of multiple allowed roles', () => {
    authState.user = { rol: 'teacher' };
    renderRoute(
      <ProtectedRoute allowedRoles={['admin', 'teacher']}>
        <div>SECRET</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
});
