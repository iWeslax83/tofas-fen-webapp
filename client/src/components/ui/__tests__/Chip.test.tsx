import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders children inside a span', () => {
    render(<Chip>Onaylandı</Chip>);
    const node = screen.getByText('Onaylandı');
    expect(node.tagName).toBe('SPAN');
  });

  it('applies the default tone (surface-2 background)', () => {
    render(<Chip>x</Chip>);
    const node = screen.getByText('x');
    expect(node.className).toContain('bg-[var(--surface-2)]');
  });

  it('flips to the state tone (red on white)', () => {
    render(<Chip tone="state">err</Chip>);
    expect(screen.getByText('err').className).toContain('bg-[var(--state)]');
  });

  it('flips to the black tone (ink on paper)', () => {
    render(<Chip tone="black">ok</Chip>);
    expect(screen.getByText('ok').className).toContain('bg-[var(--ink)]');
  });

  it('applies the outline tone (transparent + ink border)', () => {
    render(<Chip tone="outline">o</Chip>);
    const cls = screen.getByText('o').className;
    expect(cls).toContain('bg-transparent');
    expect(cls).toContain('border-[var(--ink)]');
  });

  it('merges user className with the tone classes', () => {
    render(<Chip className="extra-token">x</Chip>);
    expect(screen.getByText('x').className).toContain('extra-token');
  });

  it('forwards refs to the span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Chip ref={ref}>x</Chip>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
