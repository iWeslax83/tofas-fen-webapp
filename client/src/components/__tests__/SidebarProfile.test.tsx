/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarProfile } from '../SidebarProfile';

describe('SidebarProfile', () => {
  it('renders the user name and id', () => {
    render(<SidebarProfile name="Ali Veli" userId="2024001" role="student" />);
    expect(screen.getByText('Ali Veli')).toBeInTheDocument();
    expect(screen.getByText('2024001')).toBeInTheDocument();
  });

  it('translates the canonical roles into Turkish labels', () => {
    const cases: Array<[string, string]> = [
      ['admin', 'Yönetici'],
      ['teacher', 'Öğretmen'],
      ['student', 'Öğrenci'],
      ['parent', 'Veli'],
      ['hizmetli', 'Hizmetli'],
      ['ziyaretci', 'Ziyaretçi'],
    ];
    cases.forEach(([role, label]) => {
      const { unmount } = render(<SidebarProfile name="X" userId="1" role={role} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('falls back to the raw role string when not in the canonical map', () => {
    render(<SidebarProfile name="X" userId="1" role="wizard" />);
    expect(screen.getByText('wizard')).toBeInTheDocument();
  });

  it('renders the Pansiyon chip only when pansiyon=true', () => {
    const { rerender } = render(<SidebarProfile name="X" userId="1" role="student" />);
    expect(screen.queryByText('Pansiyon')).toBeNull();
    rerender(<SidebarProfile name="X" userId="1" role="student" pansiyon />);
    expect(screen.getByText('Pansiyon')).toBeInTheDocument();
  });

  it('renders a real photo when photoSrc is set', () => {
    render(<SidebarProfile name="Ali" userId="1" role="student" photoSrc="/photo.png" />);
    const photo = screen.getByRole('img', { name: 'Ali' });
    expect(photo).toHaveAttribute('src', '/photo.png');
  });

  it('falls back to the SVG silhouette + initials when photoSrc is missing', () => {
    const { container } = render(<SidebarProfile name="Ali Veli" userId="1" role="student" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('AV')).toBeInTheDocument();
  });

  it('shows the bare userId with no "Sicil" caption above it', () => {
    render(<SidebarProfile name="X" userId="2024001" role="admin" />);
    expect(screen.queryByText('Sicil')).toBeNull();
    expect(screen.getByText('2024001')).toBeInTheDocument();
  });

  it('renders the role badge styled for the dark sidebar', () => {
    render(<SidebarProfile name="X" userId="1" role="admin" />);
    const badge = screen.getByText('Yönetici');
    expect(badge.className).toContain('text-white');
    expect(badge.className).toContain('bg-white/10');
  });

  it('renders the pansiyon badge with a light border', () => {
    render(<SidebarProfile name="X" userId="1" role="student" pansiyon />);
    const badge = screen.getByText('Pansiyon');
    expect(badge.className).toContain('border-white/15');
    expect(badge.className).toContain('text-white/70');
  });
});
