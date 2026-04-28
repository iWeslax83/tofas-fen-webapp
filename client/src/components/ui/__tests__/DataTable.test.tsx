import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../DataTable';

interface Row {
  id: string;
  name: string;
  score: number;
}

const sample: Row[] = [
  { id: '1', name: 'Ali', score: 70 },
  { id: '2', name: 'Veli', score: 90 },
  { id: '3', name: 'Cem', score: 80 },
];

const cols: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'İsim' },
  { accessorKey: 'score', header: 'Puan' },
];

describe('DataTable', () => {
  it('renders one row per data item plus a header row', () => {
    render(<DataTable columns={cols} data={sample} />);
    const rows = screen.getAllByRole('row');
    // 1 header row + 3 body rows
    expect(rows.length).toBe(1 + sample.length);
  });

  it('renders the caption prop', () => {
    render(<DataTable columns={cols} data={sample} caption="Tablo I — Liste" />);
    expect(screen.getByText('Tablo I — Liste')).toBeInTheDocument();
  });

  it('renders the toolbar slot above the table', () => {
    render(
      <DataTable
        columns={cols}
        data={sample}
        toolbar={<button type="button">Yeni Kayıt</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Yeni Kayıt' })).toBeInTheDocument();
  });

  it('renders the empty-state message when data is empty', () => {
    render(<DataTable columns={cols} data={[]} emptyState="Kayıt yok" />);
    expect(screen.getByText('Kayıt yok')).toBeInTheDocument();
  });

  it('falls back to the default empty-state message', () => {
    render(<DataTable columns={cols} data={[]} />);
    expect(screen.getByText('Kayıt bulunamadı')).toBeInTheDocument();
  });

  it('sorts rows when a sortable column header is clicked', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={cols} data={sample} />);

    // Initial order — first body cell should be Ali
    let rows = screen.getAllByRole('row');
    let firstCell = within(rows[1]).getAllByRole('cell')[0];
    expect(firstCell.textContent).toBe('Ali');

    // Click the "İsim" header to sort asc, then again for desc
    const isimHeader = screen.getByRole('columnheader', { name: /İsim/ });
    await user.click(isimHeader);
    rows = screen.getAllByRole('row');
    firstCell = within(rows[1]).getAllByRole('cell')[0];
    expect(firstCell.textContent).toBe('Ali'); // asc

    await user.click(isimHeader);
    rows = screen.getAllByRole('row');
    firstCell = within(rows[1]).getAllByRole('cell')[0];
    expect(firstCell.textContent).toBe('Veli'); // desc
  });

  it('renders the pagination row by default', () => {
    render(<DataTable columns={cols} data={sample} />);
    // pagination renders the "İlk sayfa" button
    expect(screen.getByLabelText('İlk sayfa')).toBeInTheDocument();
  });

  it('hides the pagination row when paginated={false}', () => {
    render(<DataTable columns={cols} data={sample} paginated={false} />);
    expect(screen.queryByLabelText('İlk sayfa')).toBeNull();
  });

  it('respects pageSize for client-side pagination', () => {
    const big: Row[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `Row ${i}`,
      score: i,
    }));
    render(<DataTable columns={cols} data={big} pageSize={10} />);
    // Page 1 of 3 (25 / 10)
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    // Only 10 body rows + 1 header row = 11 total
    expect(screen.getAllByRole('row').length).toBe(11);
  });

  it('renders custom column cell content via the cell renderer', () => {
    const customCols: ColumnDef<Row>[] = [
      {
        accessorKey: 'name',
        header: 'İsim',
        cell: (info) => <strong data-testid="custom">{info.getValue<string>()}</strong>,
      },
    ];
    render(<DataTable columns={customCols} data={sample.slice(0, 1)} />);
    expect(screen.getByTestId('custom').tagName).toBe('STRONG');
    expect(screen.getByTestId('custom').textContent).toBe('Ali');
  });
});
