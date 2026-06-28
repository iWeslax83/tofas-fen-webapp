/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TodaySchedule } from '../TodaySchedule';
import { WelcomeHero } from '../WelcomeHero';

describe('TodaySchedule', () => {
  it('renders nothing when rows is empty', () => {
    const { container } = render(<TodaySchedule rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('emits the table caption "Bugünkü Program"', () => {
    render(
      <TodaySchedule
        rows={[{ id: '1', time: '08:30', subject: 'Mat', teacher: 'A.A.', room: '101' }]}
      />,
    );
    expect(screen.getByText('Bugünkü Program')).toBeInTheDocument();
  });

  it('renders one body row per schedule item with time/subject/teacher/room', () => {
    render(
      <TodaySchedule
        rows={[
          { id: '1', time: '08:30', subject: 'Matematik', teacher: 'Ali Veli', room: '101' },
          { id: '2', time: '09:30', subject: 'Fizik', teacher: 'Cem Cemal', room: '202' },
        ]}
      />,
    );
    expect(screen.getByText('08:30')).toBeInTheDocument();
    expect(screen.getByText('Matematik')).toBeInTheDocument();
    expect(screen.getByText('Ali Veli')).toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('Fizik')).toBeInTheDocument();
  });

  it('marks the active row with an "Aktif" chip', () => {
    render(
      <TodaySchedule
        rows={[
          { id: '1', time: '08:30', subject: 'Mat', teacher: 'A.A.', room: '101', isActive: true },
          { id: '2', time: '09:30', subject: 'Fiz', teacher: 'C.C.', room: '202' },
        ]}
      />,
    );
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('does not render an "Aktif" chip when no row is active', () => {
    render(
      <TodaySchedule
        rows={[{ id: '1', time: '08:30', subject: 'Mat', teacher: 'A.A.', room: '101' }]}
      />,
    );
    expect(screen.queryByText('Aktif')).toBeNull();
  });
});

describe('WelcomeHero', () => {
  it('renders a friendly greeting with the supplied name', () => {
    render(<WelcomeHero adSoyad="Ali Veli" />);
    expect(screen.getByText('Ali Veli')).toBeInTheDocument();
    expect(screen.getByText(/Merhaba/)).toBeInTheDocument();
  });

  it('uses the supplied subtitle verbatim when provided', () => {
    render(<WelcomeHero adSoyad="Ali" subtitle="4 aktif ödev" />);
    expect(screen.getByText('4 aktif ödev')).toBeInTheDocument();
  });

  it('falls back to a Turkish date subtitle when none is supplied', () => {
    render(<WelcomeHero adSoyad="Ali" />);
    // Turkish long date contains the year.
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});
