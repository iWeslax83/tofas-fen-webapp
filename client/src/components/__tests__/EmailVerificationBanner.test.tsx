/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.hoisted(() => vi.fn());
const userRef = vi.hoisted(() => ({
  current: null as { email?: string; emailVerified?: boolean; rol?: string } | null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../stores/authStore', () => ({
  useUser: () => userRef.current,
}));

import EmailVerificationBanner from '../EmailVerificationBanner';

const renderBanner = () =>
  render(
    <MemoryRouter>
      <EmailVerificationBanner />
    </MemoryRouter>,
  );

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    userRef.current = null;
  });

  it('renders nothing when there is no user', () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the user has no email', () => {
    userRef.current = { rol: 'student' };
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when emailVerified is true', () => {
    userRef.current = { email: 'a@b.c', emailVerified: true, rol: 'student' };
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when emailVerified is undefined (treated as already verified)', () => {
    userRef.current = { email: 'a@b.c', rol: 'student' };
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner when emailVerified is explicitly false', () => {
    userRef.current = { email: 'a@b.c', emailVerified: false, rol: 'student' };
    renderBanner();
    expect(screen.getByText(/E-posta adresiniz henüz doğrulanmadı/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ayarlara Git' })).toBeInTheDocument();
  });

  it('navigates to the role-scoped settings page on button click', async () => {
    userRef.current = { email: 'a@b.c', emailVerified: false, rol: 'teacher' };
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole('button', { name: 'Ayarlara Git' }));
    expect(navigateMock).toHaveBeenCalledWith('/teacher/ayarlar');
  });

  it('falls back to /student/ayarlar when the user has no rol', async () => {
    userRef.current = { email: 'a@b.c', emailVerified: false };
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole('button', { name: 'Ayarlara Git' }));
    expect(navigateMock).toHaveBeenCalledWith('/student/ayarlar');
  });
});
