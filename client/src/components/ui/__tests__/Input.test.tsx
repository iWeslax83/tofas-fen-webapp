import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Input } from '../Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Ara" />);
    const node = screen.getByPlaceholderText('Ara');
    expect(node.tagName).toBe('INPUT');
  });

  it('applies the var-driven flat-border styling', () => {
    render(<Input placeholder="x" />);
    const node = screen.getByPlaceholderText('x');
    expect(node.className).toContain('border-b');
    expect(node.className).toContain('border-[var(--rule)]');
  });

  it('forwards arbitrary attributes (type, value, name)', () => {
    render(<Input type="email" name="email" defaultValue="a@b.com" />);
    const node = screen.getByRole('textbox') as HTMLInputElement;
    expect(node).toHaveAttribute('type', 'email');
    expect(node).toHaveAttribute('name', 'email');
    expect(node.value).toBe('a@b.com');
  });

  it('fires onChange as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="t" />);
    await user.type(screen.getByPlaceholderText('t'), 'ab');
    expect(onChange).toHaveBeenCalled();
    expect((screen.getByPlaceholderText('t') as HTMLInputElement).value).toBe('ab');
  });

  it('respects the disabled attribute', () => {
    render(<Input disabled placeholder="d" />);
    expect(screen.getByPlaceholderText('d')).toBeDisabled();
  });

  it('merges user className with the var-driven base classes', () => {
    render(<Input className="extra-token" placeholder="m" />);
    expect(screen.getByPlaceholderText('m').className).toContain('extra-token');
  });

  it('forwards refs to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
