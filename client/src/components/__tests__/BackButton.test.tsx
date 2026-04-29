/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => ({
  user: null as { rol?: string } | null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => authMock,
}));

import BackButton from '../BackButton';

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('BackButton', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authMock.user = null;
  });

  it('renders with the default Turkish label', () => {
    renderWithRouter(<BackButton />);
    expect(screen.getByRole('button', { name: 'Ana Sayfaya Dön' })).toBeInTheDocument();
  });

  it('honours customText when supplied', () => {
    renderWithRouter(<BackButton customText="Geri" />);
    expect(screen.getByRole('button', { name: 'Geri' })).toBeInTheDocument();
  });

  it('hides the visible label when showText=false (aria-label still set)', () => {
    renderWithRouter(<BackButton showText={false} />);
    const button = screen.getByRole('button', { name: 'Ana Sayfaya Dön' });
    expect(button.querySelector('.back-button__text')).toBeNull();
  });

  it('navigates to /admin when the user is admin', async () => {
    authMock.user = { rol: 'admin' };
    const user = userEvent.setup();
    renderWithRouter(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(navigateMock).toHaveBeenCalledWith('/admin');
  });

  it('navigates to /student when the user is student', async () => {
    authMock.user = { rol: 'student' };
    const user = userEvent.setup();
    renderWithRouter(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(navigateMock).toHaveBeenCalledWith('/student');
  });

  it('navigates to /teacher when the user is teacher', async () => {
    authMock.user = { rol: 'teacher' };
    const user = userEvent.setup();
    renderWithRouter(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(navigateMock).toHaveBeenCalledWith('/teacher');
  });

  it('navigates to /parent when the user is parent', async () => {
    authMock.user = { rol: 'parent' };
    const user = userEvent.setup();
    renderWithRouter(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(navigateMock).toHaveBeenCalledWith('/parent');
  });

  it('navigates to / for unknown / missing roles', async () => {
    authMock.user = { rol: 'hizmetli' };
    const user = userEvent.setup();
    renderWithRouter(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('navigates to / when the user is null', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('prefers a custom onClick over the default role-based navigation', async () => {
    authMock.user = { rol: 'admin' };
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(<BackButton onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('applies size + variant modifier classes', () => {
    renderWithRouter(<BackButton size="lg" variant="floating" className="extra" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('back-button--lg');
    expect(button.className).toContain('back-button--floating');
    expect(button.className).toContain('extra');
  });
});
