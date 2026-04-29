/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useReactTable, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { DataTablePagination } from '../DataTablePagination';

interface Row {
  id: string;
  name: string;
}

const cols: ColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'id' },
  { accessorKey: 'name', header: 'name' },
];

const buildRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), name: `r${i}` }));

interface HarnessProps {
  rows?: Row[];
  pageSize?: number;
  initialPageIndex?: number;
}

function Harness({ rows = buildRows(25), pageSize = 10, initialPageIndex = 0 }: HarnessProps) {
  // Lift pagination into React state so button clicks trigger a re-render
  // of the harness — TanStack's internal state isn't observable here.
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize,
  });
  const table = useReactTable({
    data: rows,
    columns: cols,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  return <DataTablePagination table={table} />;
}

describe('DataTablePagination', () => {
  it('shows the row range and total when there are rows', () => {
    render(<Harness />);
    // 25 rows, pageSize 10, page 1 → 1–10 / 25
    expect(screen.getByText(/1–10 \/ 25/)).toBeInTheDocument();
  });

  it('shows 0–0 / 0 when there are no rows', () => {
    render(<Harness rows={[]} />);
    expect(screen.getByText(/0–0 \/ 0/)).toBeInTheDocument();
  });

  it('shows the current page indicator (X / Y)', () => {
    render(<Harness />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('disables prev / first buttons on the first page', () => {
    render(<Harness />);
    expect(screen.getByLabelText('İlk sayfa')).toBeDisabled();
    expect(screen.getByLabelText('Önceki sayfa')).toBeDisabled();
    expect(screen.getByLabelText('Sonraki sayfa')).not.toBeDisabled();
    expect(screen.getByLabelText('Son sayfa')).not.toBeDisabled();
  });

  it('disables next / last buttons on the last page', () => {
    render(<Harness initialPageIndex={2} />);
    expect(screen.getByLabelText('Sonraki sayfa')).toBeDisabled();
    expect(screen.getByLabelText('Son sayfa')).toBeDisabled();
    expect(screen.getByLabelText('İlk sayfa')).not.toBeDisabled();
    expect(screen.getByLabelText('Önceki sayfa')).not.toBeDisabled();
  });

  it('renders the per-page indicator at the requested initial page', () => {
    render(<Harness initialPageIndex={2} />);
    // 25 rows / pageSize 10 / pageIndex 2 → 3 / 3 page indicator
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('renders the middle page correctly when initialPageIndex=1', () => {
    render(<Harness initialPageIndex={1} />);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('changes pageSize via the select and resets the row range accordingly', async () => {
    const user = userEvent.setup();
    render(<Harness pageSize={10} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    const sizeSelect = screen.getByRole('combobox');
    await user.selectOptions(sizeSelect, '50');
    // 25 rows / pageSize 50 → 1 page total, 1–25 / 25
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText(/1–25 \/ 25/)).toBeInTheDocument();
  });

  it('offers all canonical page-size options (10 / 20 / 50 / 100)', () => {
    render(<Harness />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(['10', '20', '50', '100']);
  });

  it('falls back to "1 / 1" when there are no rows (pageCount = 0)', () => {
    render(<Harness rows={[]} />);
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  it('shows "X / 1" page indicator and 1–N range when the entire dataset fits in one page', () => {
    render(<Harness rows={buildRows(5)} pageSize={10} />);
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText(/1–5 \/ 5/)).toBeInTheDocument();
    expect(screen.getByLabelText('Sonraki sayfa')).toBeDisabled();
  });
});
