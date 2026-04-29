/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle';
import { useUIStore } from '../../stores/uiStore';

describe('ThemeToggle', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'system' });
    // Ensure matchMedia exists for the useTheme system-pref read.
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders a button with an aria-label that names both the current and next theme', () => {
    useUIStore.setState({ theme: 'system' });
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toContain('Sistem teması');
    expect(btn.getAttribute('aria-label')).toContain('açık tema');
  });

  it('renders the Sun icon when theme=light', () => {
    useUIStore.setState({ theme: 'light' });
    const { container } = render(<ThemeToggle />);
    // lucide renders an <svg> with a class derived from the icon name
    const svg = container.querySelector('svg');
    expect(svg?.classList.toString()).toMatch(/lucide-sun|sun/i);
  });

  it('renders the Moon icon when theme=dark', () => {
    useUIStore.setState({ theme: 'dark' });
    const { container } = render(<ThemeToggle />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.toString()).toMatch(/lucide-moon|moon/i);
  });

  it('renders the Monitor icon when theme=system', () => {
    useUIStore.setState({ theme: 'system' });
    const { container } = render(<ThemeToggle />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.toString()).toMatch(/lucide-monitor|monitor/i);
  });

  it('cycles theme light → dark on click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ theme: 'light' });
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('cycles theme dark → system on click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    expect(useUIStore.getState().theme).toBe('system');
  });

  it('cycles theme system → light on click (closes the loop)', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ theme: 'system' });
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('uses the canonical Turkish theme labels in title', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('title')).toBe('Koyu tema');
  });
});
