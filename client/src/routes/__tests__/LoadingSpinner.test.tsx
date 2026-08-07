import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../AppRoutes';

describe('LoadingSpinner', () => {
  it('renders the branded logo', () => {
    render(<LoadingSpinner />);
    const logo = screen.getByRole('img', { name: /tofaş fen/i });
    expect(logo).toBeInTheDocument();
  });

  it('shows the default message when no slowMessage is given', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('shows the slow message when provided', () => {
    render(<LoadingSpinner slowMessage="Sunucu uyandırılıyor, bu biraz sürebilir..." />);
    expect(screen.getByText('Sunucu uyandırılıyor, bu biraz sürebilir...')).toBeInTheDocument();
    expect(screen.queryByText('Yükleniyor...')).not.toBeInTheDocument();
  });

  it('renders an indeterminate progress bar', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading-progress-bar')).toBeInTheDocument();
  });
});
