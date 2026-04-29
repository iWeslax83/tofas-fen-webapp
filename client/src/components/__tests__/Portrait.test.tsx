/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Portrait } from '../Portrait';

describe('Portrait', () => {
  it('renders a real photo with the supplied alt when src is set', () => {
    render(<Portrait name="Ali Veli" src="/foo.png" />);
    const img = screen.getByRole('img', { name: 'Ali Veli' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', '/foo.png');
  });

  it('falls back to an SVG silhouette + initials overlay when src is missing', () => {
    const { container } = render(<Portrait name="Ali Veli" />);
    // No <img> tag — the component returns a div+svg
    expect(container.querySelector('img')).toBeNull();
    // SVG silhouette is present
    expect(container.querySelector('svg')).not.toBeNull();
    // Initials AV rendered as text overlay
    expect(screen.getByText('AV')).toBeInTheDocument();
  });

  it('exposes the silhouette as role=img with a descriptive aria-label', () => {
    render(<Portrait name="Ahmet" />);
    const node = screen.getByRole('img', { name: /Ahmet/ });
    expect(node.getAttribute('aria-label')).toContain('Ahmet');
    expect(node.getAttribute('aria-label')).toContain('vesikalık yok');
  });

  it('takes the first two name parts as initials, uppercased', () => {
    render(<Portrait name="ayşe gülay kaya" />);
    expect(screen.getByText('AG')).toBeInTheDocument();
  });

  it('handles a single-word name by taking just one initial', () => {
    render(<Portrait name="Mehmet" />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('handles names with extra whitespace gracefully', () => {
    render(<Portrait name="  Ali   Veli  " />);
    expect(screen.getByText('AV')).toBeInTheDocument();
  });

  it('applies the requested size class (sm)', () => {
    const { container } = render(<Portrait name="A" size="sm" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('w-10');
    expect(wrapper.className).toContain('h-[3.125rem]');
  });

  it('applies the requested size class (lg)', () => {
    const { container } = render(<Portrait name="A" size="lg" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('w-24');
    expect(wrapper.className).toContain('h-30');
  });

  it('defaults to size=md when no size is supplied', () => {
    const { container } = render(<Portrait name="A" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('w-16');
    expect(wrapper.className).toContain('h-20');
  });

  it('merges a user-provided className with the size + frame classes', () => {
    const { container } = render(<Portrait name="A" className="extra-token" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('extra-token');
  });

  it('also merges className on the photo branch', () => {
    render(<Portrait name="A" src="/foo.png" className="extra-token" />);
    const img = screen.getByRole('img', { name: 'A' });
    expect(img.className).toContain('extra-token');
  });
});
