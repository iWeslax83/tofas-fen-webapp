import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children inside the outer shell', () => {
    render(<Card>İçerik</Card>);
    expect(screen.getByText('İçerik')).toBeInTheDocument();
  });

  it('does not render an accent bar by default', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders the kırmızı accent bar when accentBar is set', () => {
    const { container } = render(<Card accentBar>x</Card>);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar).not.toBeNull();
    expect(bar?.className).toContain('bg-[var(--state)]');
  });

  it('pads the inner wrapper to clear the accent bar', () => {
    const { container } = render(<Card accentBar>x</Card>);
    // Inner wrapper is the only child div inside the outer Card div.
    const outer = container.firstChild as HTMLElement;
    const inner = outer.querySelector(':scope > div');
    expect(inner?.className).toContain('pl-3');
  });

  it('applies the tinted tone background', () => {
    const { container } = render(<Card tone="tinted">x</Card>);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('bg-[var(--surface)]');
  });

  it('puts user-provided className on the outer shell', () => {
    const { container } = render(<Card className="outer-token">x</Card>);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('outer-token');
  });

  it('puts contentClassName on the inner wrapper, not the outer shell', () => {
    const { container } = render(
      <Card className="outer" contentClassName="inner-token">
        x
      </Card>,
    );
    const outer = container.firstChild as HTMLElement;
    const inner = outer.firstChild as HTMLElement;
    expect(outer.className).not.toContain('inner-token');
    expect(inner.className).toContain('inner-token');
  });

  it('forwards refs to the outer shell div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>ref</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
