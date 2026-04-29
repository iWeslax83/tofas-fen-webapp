/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { KpiTable } from '../KpiTable';
import { QuickActions } from '../QuickActions';
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

  it('emits the section heading "Tablo I — Anahtar Göstergeler"', () => {
    render(<KpiTable items={[{ label: 'X', value: '10' }]} />);
    expect(screen.getByText(/Tablo I/)).toBeInTheDocument();
  });
});

describe('QuickActions', () => {
  const sampleActions = [
    { key: 'new', shortcut: 'N', label: 'Yeni Kayıt', onSelect: vi.fn() },
    { key: 'edit', shortcut: 'E', label: 'Düzenle', onSelect: vi.fn() },
  ];

  it('renders nothing when actions is empty', () => {
    const { container } = render(<QuickActions actions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one button per action with shortcut + label', () => {
    render(<QuickActions actions={sampleActions} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(screen.getByText('Yeni Kayıt')).toBeInTheDocument();
    expect(screen.getByText('Düzenle')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('fires onSelect when the button is clicked', async () => {
    const onSelect = vi.fn();
    const actions = [{ key: 'a', shortcut: 'A', label: 'Aksiyon', onSelect }];
    const user = userEvent.setup();
    render(<QuickActions actions={actions} />);
    await user.click(screen.getByRole('button', { name: /Aksiyon/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('AnnouncementCard', () => {
  it('renders the title + body', () => {
    render(<AnnouncementCard title="Toplantı" body="Saat 14:00'te." />);
    expect(screen.getByText('Toplantı')).toBeInTheDocument();
    expect(screen.getByText("Saat 14:00'te.")).toBeInTheDocument();
  });

  it('renders the file number when supplied', () => {
    render(<AnnouncementCard title="t" body="b" fileNo="2026/123" />);
    expect(screen.getByText(/2026\/123/)).toBeInTheDocument();
  });

  it('omits the file number when not supplied', () => {
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

  it('emits the table caption "Tablo III — Ödev Kuyruğu"', () => {
    render(<HomeworkQueue rows={[{ id: '1', code: 'X', subject: 'Y', dueLabel: 'Z' }]} />);
    expect(screen.getByText(/Tablo III/)).toBeInTheDocument();
  });
});
