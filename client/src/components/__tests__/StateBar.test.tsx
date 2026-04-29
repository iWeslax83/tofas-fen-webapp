/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateBar } from '../StateBar';

describe('StateBar', () => {
  it('renders as a banner landmark', () => {
    render(<StateBar />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('contains the resmî T.C. text in mono uppercase', () => {
    render(<StateBar />);
    const text = screen.getByText(/T\.C\. · Tofaş Fen Lisesi · Bilgi Sistemi/);
    expect(text).toBeInTheDocument();
    expect(text.className).toContain('font-mono');
    expect(text.className).toContain('uppercase');
  });

  it('uses the state colour and is sticky-positioned', () => {
    render(<StateBar />);
    const banner = screen.getByRole('banner');
    expect(banner.className).toContain('bg-[var(--state)]');
    expect(banner.className).toContain('sticky');
    expect(banner.className).toContain('top-0');
  });

  it('renders at the canonical 30px ministerial height', () => {
    render(<StateBar />);
    const banner = screen.getByRole('banner');
    expect(banner.className).toContain('h-[30px]');
  });

  it('uses white text on the state background', () => {
    render(<StateBar />);
    expect(screen.getByRole('banner').className).toContain('text-white');
  });
});
