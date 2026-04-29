/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TodaySchedule } from '../TodaySchedule';
import { OfficialNoticeHero } from '../OfficialNoticeHero';

describe('TodaySchedule', () => {
  it('renders nothing when rows is empty', () => {
    const { container } = render(<TodaySchedule rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('emits the table caption "Tablo II — Bugünkü Program"', () => {
    render(
      <TodaySchedule
        rows={[{ id: '1', time: '08:30', subject: 'Mat', teacher: 'A.A.', room: '101' }]}
      />,
    );
    expect(screen.getByText(/Tablo II/)).toBeInTheDocument();
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

describe('OfficialNoticeHero', () => {
  it('renders the salutation with the supplied name', () => {
    render(<OfficialNoticeHero adSoyad="Ali Veli" />);
    // Name is wrapped in a span — match within an outer paragraph.
    expect(screen.getByText('Ali Veli')).toBeInTheDocument();
    expect(screen.getByText(/Sayın/)).toBeInTheDocument();
  });

  it('uses the supplied notice number verbatim', () => {
    render(<OfficialNoticeHero adSoyad="Ali" noticeNo="2026/0428-A" />);
    expect(screen.getByText(/No\. 2026\/0428-A/)).toBeInTheDocument();
  });

  it('falls back to a today-derived notice number when not supplied', () => {
    render(<OfficialNoticeHero adSoyad="Ali" />);
    // Format yyyy/MMdd — match the structural pattern.
    const banner = screen.getByText(/Resmi Bildirim/);
    expect(banner.textContent).toMatch(/No\.\s+\d{4}\/\d{4}/);
  });

  it('uses the supplied body verbatim when provided', () => {
    render(<OfficialNoticeHero adSoyad="Ali" body="Özel mesaj." />);
    expect(screen.getByText('Özel mesaj.')).toBeInTheDocument();
  });

  it('falls back to a Turkish default body when no body is provided', () => {
    render(<OfficialNoticeHero adSoyad="Ali" />);
    expect(screen.getByText(/akademik kayıtlarınız işlenmiştir/)).toBeInTheDocument();
  });
});
