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

  // Rozetler hap değil, köşeli çerçeveli etiket: durum rengi çerçevede ve
  // yazıda, arka plan boş.
  it('is a squared, bordered tag rather than a pill', () => {
    render(<Chip>x</Chip>);
    const cls = screen.getByText('x').className;
    expect(cls).not.toContain('rounded-full');
    expect(cls).toContain('rounded-[3px]');
    expect(cls).toContain('border');
  });

  it('applies the default tone (surface-2 background, rule border)', () => {
    render(<Chip>x</Chip>);
    const cls = screen.getByText('x').className;
    expect(cls).toContain('bg-[var(--surface-2)]');
    expect(cls).toContain('border-[var(--rule)]');
  });

  it('carries the state tone on the border and text, not as a fill', () => {
    render(<Chip tone="state">err</Chip>);
    const cls = screen.getByText('err').className;
    expect(cls).toContain('bg-transparent');
    expect(cls).toContain('text-[var(--accent)]');
    expect(cls).toContain('border-[var(--accent)]');
  });

  it('carries the warn tone the same way', () => {
    const cls = (render(<Chip tone="warn">uyari</Chip>), screen.getByText('uyari').className);
    expect(cls).toContain('bg-transparent');
    expect(cls).toContain('border-[var(--warn)]');
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
