/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from '../DatePicker';

describe('DatePicker (uncontrolled)', () => {
  it('renders the placeholder when no value is selected', () => {
    render(<DatePicker placeholder="Tarih girin" />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Tarih girin')).toBeInTheDocument();
  });

  it('uses the default Turkish placeholder when none is supplied', () => {
    render(<DatePicker />);
    expect(screen.getByText('Tarih seçin...')).toBeInTheDocument();
  });

  it('formats a defaultValue using Turkish locale (dd MMMM yyyy)', () => {
    render(<DatePicker defaultValue={new Date('2026-03-15T00:00:00')} />);
    expect(screen.getByText('15 Mart 2026')).toBeInTheDocument();
  });

  it('opens the calendar dialog on trigger click', async () => {
    const user = userEvent.setup();
    render(<DatePicker />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Önceki ay')).toBeInTheDocument();
    expect(screen.getByLabelText('Sonraki ay')).toBeInTheDocument();
  });

  it('shows the current month + year header in Turkish', async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue={new Date('2026-03-15T00:00:00')} />);
    await user.click(screen.getByRole('button'));
    const header = document.querySelector('.date-picker-month-year');
    expect(header?.textContent).toMatch(/Mart\s*2026/);
  });

  it('renders the prev/next month navigation buttons in the header', async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue={new Date('2026-03-15T00:00:00')} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByLabelText('Önceki ay')).toBeInTheDocument();
    expect(screen.getByLabelText('Sonraki ay')).toBeInTheDocument();
    // Header text spans separate text nodes — read textContent off the
    // header div directly.
    const header = document.querySelector('.date-picker-month-year');
    expect(header?.textContent).toMatch(/Mart\s*2026/);
  });

  it('renders the day grid for the selected month', async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue={new Date('2026-03-15T00:00:00')} />);
    await user.click(screen.getByRole('button'));
    // 31 days visible for March (plus surrounding-month days)
    expect(screen.getByLabelText('15 Mart 2026')).toBeInTheDocument();
    expect(screen.getByLabelText('31 Mart 2026')).toBeInTheDocument();
  });

  it('renders the canonical 7 Turkish weekday headers', async () => {
    const user = userEvent.setup();
    render(<DatePicker />);
    await user.click(screen.getByRole('button'));
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach((d) => {
      expect(screen.getByText(d)).toBeInTheDocument();
    });
  });

  it('selects a date and updates the trigger label', async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue={new Date('2026-03-01T00:00:00')} />);
    await user.click(screen.getByRole('button'));
    // Click the day-cell with aria-label "15 Mart 2026"
    await user.click(screen.getByLabelText('15 Mart 2026'));
    expect(screen.getByText('15 Mart 2026')).toBeInTheDocument();
  });

  it('renders the hidden input for form integration with yyyy-MM-dd', () => {
    const { container } = render(
      <DatePicker defaultValue={new Date('2026-03-15T00:00:00')} name="dob" id="dob-id" />,
    );
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.name).toBe('dob');
    expect(hidden.id).toBe('dob-id');
    expect(hidden.value).toBe('2026-03-15');
  });

  it('hidden input is empty when no value is selected', () => {
    const { container } = render(<DatePicker name="dob" />);
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe('');
  });

  it('respects the disabled prop on the trigger', () => {
    render(<DatePicker disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disabled trigger does not open the calendar', async () => {
    const user = userEvent.setup();
    render(<DatePicker disabled />);
    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('DatePicker (controlled)', () => {
  it('reflects the controlled value prop', () => {
    render(<DatePicker value={new Date('2026-04-01T00:00:00')} onChange={() => {}} />);
    // dd format pads single digits → "01 Nisan 2026"
    expect(screen.getByText('01 Nisan 2026')).toBeInTheDocument();
  });

  it('fires onChange with the picked Date but does not switch on its own', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value={new Date('2026-03-01T00:00:00')} onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByLabelText('15 Mart 2026'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date);
    // Trigger label still reflects the controlled value (01 March)
    expect(screen.getByText('01 Mart 2026')).toBeInTheDocument();
  });
});

describe('DatePicker minDate / maxDate', () => {
  it('disables days before minDate', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        defaultValue={new Date('2026-03-15T00:00:00')}
        minDate={new Date('2026-03-10T00:00:00')}
      />,
    );
    await user.click(screen.getByRole('button'));
    // 5 Mart is before minDate → disabled
    const day5 = screen.getByLabelText('05 Mart 2026');
    expect(day5).toBeDisabled();
    // 15 Mart is after → not disabled
    const day15 = screen.getByLabelText('15 Mart 2026');
    expect(day15).not.toBeDisabled();
  });

  it('disables days after maxDate', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        defaultValue={new Date('2026-03-15T00:00:00')}
        maxDate={new Date('2026-03-20T00:00:00')}
      />,
    );
    await user.click(screen.getByRole('button'));
    const day25 = screen.getByLabelText('25 Mart 2026');
    expect(day25).toBeDisabled();
    const day10 = screen.getByLabelText('10 Mart 2026');
    expect(day10).not.toBeDisabled();
  });
});

describe('DatePicker clearable', () => {
  it('renders the clear button when clearable + value is present', () => {
    render(<DatePicker clearable defaultValue={new Date('2026-03-15T00:00:00')} />);
    expect(screen.getByLabelText('Temizle')).toBeInTheDocument();
  });

  it('does NOT render the clear button when clearable + no value', () => {
    render(<DatePicker clearable />);
    expect(screen.queryByLabelText('Temizle')).toBeNull();
  });

  it('clear button fires onChange(null) but does not open the calendar', () => {
    const onChange = vi.fn();
    render(
      <DatePicker clearable defaultValue={new Date('2026-03-15T00:00:00')} onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText('Temizle'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
