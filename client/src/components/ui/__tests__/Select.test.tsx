/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, SelectItem, SelectGroup } from '../Select';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
];

describe('Select (uncontrolled)', () => {
  it('renders the placeholder when no value is selected', () => {
    render(<Select options={options} placeholder="Pick one" />);
    const trigger = screen.getByRole('button', { name: 'Pick one' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses the default Turkish placeholder when none is supplied', () => {
    render(<Select options={options} />);
    expect(screen.getByRole('button', { name: 'Seçiniz...' })).toBeInTheDocument();
  });

  it('renders the selected option label when defaultValue is set', () => {
    render(<Select options={options} defaultValue="b" />);
    expect(screen.getByRole('button', { name: 'Banana' })).toBeInTheDocument();
  });

  it('opens the listbox when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // All options visible
    expect(screen.getByRole('option', { name: /Apple/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Banana/ })).toBeInTheDocument();
  });

  it('selecting an option updates the trigger label', async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: /Banana/ }));
    // Trigger now reflects the chosen option (listbox close is gated on
    // framer-motion's exit animation which doesn't run in jsdom).
    expect(screen.getByRole('button', { name: 'Banana' })).toBeInTheDocument();
  });

  it('skips disabled options on click', async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    await user.click(screen.getByRole('button'));
    const disabledOpt = screen.getByRole('option', { name: /Cherry/ });
    expect(disabledOpt).toBeDisabled();
    await user.click(disabledOpt);
    // Listbox stays open since disabled didn't fire change
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('renders the hidden input for form integration', () => {
    const { container } = render(
      <Select options={options} defaultValue="a" name="fruit" id="fruit-id" />,
    );
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.name).toBe('fruit');
    expect(hidden.id).toBe('fruit-id');
    expect(hidden.value).toBe('a');
  });

  it('respects the disabled prop on the trigger', () => {
    render(<Select options={options} disabled />);
    expect(screen.getByRole('button', { name: 'Seçiniz...' })).toBeDisabled();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<Select options={options} disabled />);
    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('Select (controlled)', () => {
  it('reflects the controlled value prop', () => {
    render(<Select options={options} value="b" onValueChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Banana' })).toBeInTheDocument();
  });

  it('fires onValueChange but does not switch on its own', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={options} value="a" onValueChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: /Banana/ }));
    expect(onChange).toHaveBeenCalledWith('b');
    // Trigger label still reflects controlled value 'a'
    expect(screen.getByRole('button', { name: 'Apple' })).toBeInTheDocument();
  });
});

describe('Select clearable', () => {
  it('renders a clear button only when clearable + value is set', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Select options={options} clearable defaultValue="a" />);
    expect(screen.getByLabelText('Temizle')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Temizle'));
    // After clearing, value is empty so the clear button is gone
    rerender(<Select options={options} clearable />);
    expect(screen.queryByLabelText('Temizle')).toBeNull();
  });
});

describe('Select searchable', () => {
  it('renders a search input when searchable + open', async () => {
    const user = userEvent.setup();
    render(<Select options={options} searchable />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Ara...')).toBeInTheDocument();
  });

  it('filters options by the search query', async () => {
    const user = userEvent.setup();
    render(<Select options={options} searchable />);
    await user.click(screen.getByRole('button'));
    const search = screen.getByPlaceholderText('Ara...');
    // Use fireEvent.change for a single synchronous re-render — userEvent.type
    // sometimes loses keystrokes when the click-outside listener picks up
    // intervening focus changes in jsdom.
    fireEvent.change(search, { target: { value: 'ban' } });
    expect(screen.queryByRole('option', { name: /Apple/ })).toBeNull();
    expect(screen.getByRole('option', { name: /Banana/ })).toBeInTheDocument();
  });

  it('shows the empty-state message when no options match', async () => {
    const user = userEvent.setup();
    render(<Select options={options} searchable />);
    await user.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Ara...'), { target: { value: 'xyz' } });
    expect(screen.getByText('Sonuç bulunamadı')).toBeInTheDocument();
  });
});

describe('Select grouped options', () => {
  it('renders a group label for non-default groups', async () => {
    const user = userEvent.setup();
    const grouped = [
      { value: 'r', label: 'Red', group: 'Warm' },
      { value: 'b', label: 'Blue', group: 'Cool' },
    ];
    render(<Select options={grouped} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Warm')).toBeInTheDocument();
    expect(screen.getByText('Cool')).toBeInTheDocument();
  });
});

describe('SelectItem + SelectGroup composition exports', () => {
  it('SelectItem renders a button with the supplied data-value', () => {
    render(<SelectItem value="x">Label</SelectItem>);
    const btn = screen.getByRole('button', { name: 'Label' });
    expect(btn).toHaveAttribute('data-value', 'x');
  });

  it('SelectItem honours the disabled prop', () => {
    render(
      <SelectItem value="x" disabled>
        Label
      </SelectItem>,
    );
    expect(screen.getByRole('button', { name: 'Label' })).toBeDisabled();
  });

  it('SelectGroup renders a group label and children', () => {
    render(
      <SelectGroup label="Section A">
        <SelectItem value="a">Item</SelectItem>
      </SelectGroup>,
    );
    expect(screen.getByText('Section A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item' })).toBeInTheDocument();
  });
});
