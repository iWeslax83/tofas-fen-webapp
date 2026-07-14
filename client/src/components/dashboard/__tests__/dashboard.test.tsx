/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { KpiTable } from '../KpiTable';
import { RecentActivity, relativeTime, type ActivityEntry } from '../RecentActivity';
import { AnnouncementCard } from '../AnnouncementCard';
import { HomeworkQueue } from '../HomeworkQueue';

describe('KpiTable', () => {
  it('renders nothing when items is empty', () => {
    const { container } = render(<KpiTable items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one cell per item with label + value', () => {
    render(
      <KpiTable
        items={[
          { label: 'Devamsızlık', value: '3' },
          { label: 'Not Ortalaması', value: '85' },
        ]}
      />,
    );
    expect(screen.getByText('Devamsızlık')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Not Ortalaması')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('renders the optional badge when supplied', () => {
    render(<KpiTable items={[{ label: 'X', value: '10', badge: '+2' }]} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('omits the badge when not supplied', () => {
    render(<KpiTable items={[{ label: 'X', value: '10' }]} />);
    expect(screen.queryByText('+2')).toBeNull();
  });

  it('emits the section heading "Genel Bakış"', () => {
    render(<KpiTable items={[{ label: 'X', value: '10' }]} />);
    expect(screen.getByText('Genel Bakış')).toBeInTheDocument();
  });
});

describe('RecentActivity', () => {
  const entries: ActivityEntry[] = [
    {
      id: 'note-1',
      kind: 'note',
      title: 'Matematik notu girildi',
      detail: 'Ortalama 85',
      date: new Date('2026-07-14T09:00:00Z').toISOString(),
      url: '/student/notlar',
    },
    {
      id: 'ann-1',
      kind: 'announcement',
      title: 'Veli toplantısı',
      detail: 'Duyuru · Müdürlük',
      date: new Date('2026-07-13T09:00:00Z').toISOString(),
      url: '/student/duyurular',
    },
  ];

  const renderFeed = (list: ActivityEntry[]) =>
    render(
      <MemoryRouter>
        <RecentActivity entries={list} />
      </MemoryRouter>,
    );

  it('says so plainly when there is nothing to show', () => {
    renderFeed([]);
    expect(screen.getByText('Henüz bir hareket yok.')).toBeInTheDocument();
  });

  it('renders one row per entry, each linking to its record', () => {
    renderFeed(entries);
    expect(screen.getByText('Matematik notu girildi')).toBeInTheDocument();
    expect(screen.getByText('Ortalama 85')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Matematik notu/ })).toHaveAttribute(
      'href',
      '/student/notlar',
    );
    expect(screen.getByRole('link', { name: /Veli toplantısı/ })).toHaveAttribute(
      'href',
      '/student/duyurular',
    );
  });

  it('emits the section heading "Son Hareketler"', () => {
    renderFeed(entries);
    expect(screen.getByText('Son Hareketler')).toBeInTheDocument();
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-07-14T12:00:00Z');

  it('counts minutes, hours and days in Turkish', () => {
    expect(relativeTime(new Date('2026-07-14T11:30:00Z').toISOString(), now)).toBe(
      '30 dakika önce',
    );
    expect(relativeTime(new Date('2026-07-14T09:00:00Z').toISOString(), now)).toBe('3 saat önce');
    expect(relativeTime(new Date('2026-07-12T12:00:00Z').toISOString(), now)).toBe('2 gün önce');
  });

  it('falls back to a plain date once a week has passed', () => {
    expect(relativeTime(new Date('2026-06-02T12:00:00Z').toISOString(), now)).toBe('2 Haziran');
  });

  it('says "az önce" for something that just happened', () => {
    expect(relativeTime(new Date('2026-07-14T11:59:50Z').toISOString(), now)).toBe('az önce');
  });
});

describe('AnnouncementCard', () => {
  it('renders the title + body', () => {
    render(<AnnouncementCard title="Toplantı" body="Saat 14:00'te." />);
    expect(screen.getByText('Toplantı')).toBeInTheDocument();
    expect(screen.getByText("Saat 14:00'te.")).toBeInTheDocument();
  });

  it('no longer renders a ministerial file number', () => {
    render(<AnnouncementCard title="t" body="b" />);
    expect(screen.queryByText(/Dosya No/)).toBeNull();
  });

  it('renders the date label when supplied', () => {
    render(<AnnouncementCard title="t" body="b" date="01.04.2026" />);
    expect(screen.getByText('01.04.2026')).toBeInTheDocument();
  });

  it('always renders the kırmızı "Duyuru" header band', () => {
    render(<AnnouncementCard title="t" body="b" />);
    expect(screen.getByText('Duyuru')).toBeInTheDocument();
  });
});

describe('HomeworkQueue', () => {
  it('renders nothing when there are no rows', () => {
    const { container } = render(<HomeworkQueue rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one body row per homework item with code + subject + due label', () => {
    render(
      <HomeworkQueue
        rows={[
          { id: '1', code: 'MAT', subject: 'Matematik', dueLabel: 'Yarın' },
          { id: '2', code: 'FIZ', subject: 'Fizik', dueLabel: '3 gün' },
        ]}
      />,
    );
    expect(screen.getByText('MAT')).toBeInTheDocument();
    expect(screen.getByText('Matematik')).toBeInTheDocument();
    expect(screen.getByText('Yarın')).toBeInTheDocument();
    expect(screen.getByText('FIZ')).toBeInTheDocument();
    expect(screen.getByText('Fizik')).toBeInTheDocument();
    expect(screen.getByText('3 gün')).toBeInTheDocument();
  });

  it('renders a check-box per row with an aria-label keyed off subject', () => {
    render(
      <HomeworkQueue rows={[{ id: '1', code: 'MAT', subject: 'Matematik', dueLabel: 'Yarın' }]} />,
    );
    expect(
      screen.getByRole('checkbox', { name: /Matematik ödevini işaretle/ }),
    ).toBeInTheDocument();
  });

  it('emits the table caption "Ödev Kuyruğu"', () => {
    render(<HomeworkQueue rows={[{ id: '1', code: 'X', subject: 'Y', dueLabel: 'Z' }]} />);
    expect(screen.getByText('Ödev Kuyruğu')).toBeInTheDocument();
  });
});
