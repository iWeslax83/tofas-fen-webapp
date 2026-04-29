/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel } from '@tanstack/react-table';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { DataTableToolbar } from '../DataTableToolbar';

interface Row {
  id: string;
  name: string;
}
const data: Row[] = [
  { id: '1', name: 'Ali' },
  { id: '2', name: 'Veli' },
];
const cols: ColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'id' },
  { accessorKey: 'name', header: 'name' },
];

interface HarnessProps {
  searchColumn?: string;
  searchPlaceholder?: string;
  filterChips?: Array<{ columnId: string; label: string }>;
  onCreate?: () => void;
  createLabel?: string;
  initialFilters?: Array<{ id: string; value: unknown }>;
}

function Harness({
  searchColumn,
  searchPlaceholder,
  filterChips,
  onCreate,
  createLabel,
  initialFilters = [],
}: HarnessProps) {
  // Lift columnFilters into React state so the toolbar's filter writes
  // trigger a re-render — TanStack's internal state isn't observable.
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialFilters as ColumnFiltersState,
  );
  const table = useReactTable({
    data,
    columns: cols,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  return (
    <DataTableToolbar
      table={table}
      searchColumn={searchColumn}
      searchPlaceholder={searchPlaceholder}
      filterChips={filterChips}
      onCreate={onCreate}
      createLabel={createLabel}
    />
  );
}

describe('DataTableToolbar', () => {
  it('renders without a search input or create button when no props are supplied', () => {
    const { container } = render(<Harness />);
    expect(screen.queryByPlaceholderText('Ara…')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    // The flex shell still renders.
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the search input with the default Turkish placeholder when searchColumn is set', () => {
    render(<Harness searchColumn="name" />);
    expect(screen.getByPlaceholderText('Ara…')).toBeInTheDocument();
  });

  it('honours a custom searchPlaceholder', () => {
    render(<Harness searchColumn="name" searchPlaceholder="İsim ara…" />);
    expect(screen.getByPlaceholderText('İsim ara…')).toBeInTheDocument();
  });

  it('typing in the search input applies a column filter to the table', () => {
    render(<Harness searchColumn="name" />);
    const search = screen.getByPlaceholderText('Ara…');
    fireEvent.change(search, { target: { value: 'ali' } });
    // Re-query — the input reflects its controlled value via table state.
    expect((screen.getByPlaceholderText('Ara…') as HTMLInputElement).value).toBe('ali');
  });

  it('renders chips when filterChips has entries', () => {
    render(
      <Harness
        searchColumn="name"
        filterChips={[
          { columnId: 'name', label: 'Ali' },
          { columnId: 'id', label: '1' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Ali filtresini kaldır')).toBeInTheDocument();
    expect(screen.getByLabelText('1 filtresini kaldır')).toBeInTheDocument();
  });

  it('does not render any chip wrapper when filterChips is empty', () => {
    render(<Harness filterChips={[]} />);
    expect(screen.queryByLabelText(/filtresini kaldır/)).toBeNull();
  });

  it('clicking a chip clears its column filter on the table', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        searchColumn="name"
        initialFilters={[{ id: 'name', value: 'ali' }]}
        filterChips={[{ columnId: 'name', label: 'Ali' }]}
      />,
    );
    // Sanity — the filter is set initially.
    expect((screen.getByPlaceholderText('Ara…') as HTMLInputElement).value).toBe('ali');
    await user.click(screen.getByLabelText('Ali filtresini kaldır'));
    expect((screen.getByPlaceholderText('Ara…') as HTMLInputElement).value).toBe('');
  });

  it('renders the create button when onCreate is supplied, with default Turkish label', () => {
    render(<Harness onCreate={() => {}} />);
    expect(screen.getByRole('button', { name: /Yeni Kayıt/ })).toBeInTheDocument();
  });

  it('honours a custom createLabel', () => {
    render(<Harness onCreate={() => {}} createLabel="Yeni Ödev" />);
    expect(screen.getByRole('button', { name: /Yeni Ödev/ })).toBeInTheDocument();
  });

  it('clicking the create button fires onCreate', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<Harness onCreate={onCreate} />);
    await user.click(screen.getByRole('button', { name: /Yeni Kayıt/ }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
