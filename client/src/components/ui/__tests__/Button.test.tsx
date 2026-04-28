import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children inside a button element', () => {
    render(<Button>Kaydet</Button>);
    const btn = screen.getByRole('button', { name: 'Kaydet' });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('defaults to type="button" so it never accidentally submits a form', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('honours an explicit type prop', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('fires onClick on user activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('blocks the click handler when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows the loading spinner and a screen-reader label, and disables interaction', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Yükleniyor')).toBeInTheDocument();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button').className).toContain('bg-[var(--ink)]');
  });

  it('switches to the danger variant when requested', () => {
    render(<Button variant="danger">Sil</Button>);
    expect(screen.getByRole('button').className).toContain('bg-[var(--state)]');
  });

  it('applies size classes', () => {
    render(<Button size="sm">small</Button>);
    expect(screen.getByRole('button').className).toContain('h-8');
  });

  it('expands to full width when fullWidth is set', () => {
    render(<Button fullWidth>wide</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });

  it('merges user-provided className with the variant classes', () => {
    render(<Button className="extra-token">extra</Button>);
    expect(screen.getByRole('button').className).toContain('extra-token');
  });

  it('forwards refs to the underlying button DOM node', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
