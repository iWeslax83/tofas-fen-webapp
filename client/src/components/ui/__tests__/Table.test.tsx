/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '../Table';
import type { TableColumn } from '../Table';

interface Row {
  id: string;
  name: string;
  score: number;
}
const sample: Row[] = [
  { id: '1', name: 'Veli', score: 80 },
  { id: '2', name: 'Ali', score: 70 },
  { id: '3', name: 'Cem', score: 95 },
];
const cols: TableColumn<Row>[] = [
  { key: 'name', header: 'İsim', sortable: true },
  { key: 'score', header: 'Puan', sortable: true, align: 'right' },
];

describe('Table — basic render', () => {
  it('renders a table with header cells per column', () => {
    render(<Table data={sample} columns={cols} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /İsim/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Puan/ })).toBeInTheDocument();
  });

  it('renders one body row per data item', () => {
    render(<Table data={sample} columns={cols} />);
    // 1 header row + 3 data rows
    expect(screen.getAllByRole('row')).toHaveLength(1 + sample.length);
  });

  it('renders the empty-state message when data is empty', () => {
    render(<Table data={[]} columns={cols} />);
    expect(screen.getByText('Veri bulunamadı')).toBeInTheDocument();
  });

  it('honours a custom emptyMessage', () => {
    render(<Table data={[]} columns={cols} emptyMessage="Hiç kayıt yok" />);
    expect(screen.getByText('Hiç kayıt yok')).toBeInTheDocument();
  });

  it('renders a loading spinner when loading=true', () => {
    render(<Table data={[]} columns={cols} loading />);
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('Table — accessor + render', () => {
  it('uses an accessor function to compute cell values', () => {
    const customCols: TableColumn<Row>[] = [
      { key: 'composite', header: 'C', accessor: (r) => `${r.name}-${r.score}` },
    ];
    render(<Table data={sample} columns={customCols} />);
    expect(screen.getByText('Ali-70')).toBeInTheDocument();
    expect(screen.getByText('Veli-80')).toBeInTheDocument();
  });

  it('uses a render function to wrap the cell', () => {
    const customCols: TableColumn<Row>[] = [
      {
        key: 'name',
        header: 'İsim',
        render: (val) => <strong data-testid="rendered">{val as string}</strong>,
      },
    ];
    render(<Table data={sample.slice(0, 1)} columns={customCols} />);
    const node = screen.getByTestId('rendered');
    expect(node.tagName).toBe('STRONG');
    expect(node.textContent).toBe('Veli');
  });
});

describe('Table — sorting', () => {
  it('sorts rows ascending on header click', async () => {
    const user = userEvent.setup();
    render(<Table data={sample} columns={cols} />);
    await user.click(screen.getByRole('columnheader', { name: /İsim/ }));
    const rows = screen.getAllByRole('row').slice(1);
    const firstCells = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    // 'tr' locale sort: Ali, Cem, Veli
    expect(firstCells).toEqual(['Ali', 'Cem', 'Veli']);
  });

  it('flips to descending on a second click', async () => {
    const user = userEvent.setup();
    render(<Table data={sample} columns={cols} />);
    await user.click(screen.getByRole('columnheader', { name: /İsim/ }));
    await user.click(screen.getByRole('columnheader', { name: /İsim/ }));
    const rows = screen.getAllByRole('row').slice(1);
    const firstCells = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(firstCells).toEqual(['Veli', 'Cem', 'Ali']);
  });

  it('clears the sort on a third click', async () => {
    const user = userEvent.setup();
    render(<Table data={sample} columns={cols} />);
    const header = screen.getByRole('columnheader', { name: /İsim/ });
    await user.click(header);
    await user.click(header);
    await user.click(header);
    const rows = screen.getAllByRole('row').slice(1);
    const firstCells = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    // Original order
    expect(firstCells).toEqual(['Veli', 'Ali', 'Cem']);
  });

  it('sorts numeric columns numerically (not lexicographically)', async () => {
    const user = userEvent.setup();
    render(<Table data={sample} columns={cols} />);
    await user.click(screen.getByRole('columnheader', { name: /Puan/ }));
    const rows = screen.getAllByRole('row').slice(1);
    const scoreCells = rows.map((r) => within(r).getAllByRole('cell')[1].textContent);
    expect(scoreCells).toEqual(['70', '80', '95']);
  });

  it('does NOT sort when the column is not flagged sortable', async () => {
    const user = userEvent.setup();
    const noSortCols: TableColumn<Row>[] = [{ key: 'name', header: 'İsim' }];
    render(<Table data={sample} columns={noSortCols} />);
    const header = screen.getByRole('columnheader', { name: /İsim/ });
    await user.click(header);
    const rows = screen.getAllByRole('row').slice(1);
    const firstCells = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(firstCells).toEqual(['Veli', 'Ali', 'Cem']);
  });

  it('sortable=false at table level disables all sorts', async () => {
    const user = userEvent.setup();
    render(<Table data={sample} columns={cols} sortable={false} />);
    await user.click(screen.getByRole('columnheader', { name: /İsim/ }));
    const rows = screen.getAllByRole('row').slice(1);
    const firstCells = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(firstCells).toEqual(['Veli', 'Ali', 'Cem']);
  });
});

describe('Table — filtering', () => {
  it('filterable=true on a column shows the filter input', () => {
    const filterableCols: TableColumn<Row>[] = [{ key: 'name', header: 'İsim', filterable: true }];
    render(<Table data={sample} columns={filterableCols} filterable />);
    expect(screen.getByPlaceholderText('Filtrele...')).toBeInTheDocument();
  });

  it('typing into the filter narrows the visible rows', () => {
    const filterableCols: TableColumn<Row>[] = [{ key: 'name', header: 'İsim', filterable: true }];
    render(<Table data={sample} columns={filterableCols} filterable />);
    fireEvent.change(screen.getByPlaceholderText('Filtrele...'), {
      target: { value: 'ali' },
    });
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Ali');
  });
});

describe('Table — pagination', () => {
  const big: Row[] = Array.from({ length: 25 }, (_, i) => ({
    id: String(i),
    name: `Row ${i}`,
    score: i,
  }));

  it('does not render pagination when pagination=false (default)', () => {
    render(<Table data={big} columns={cols} />);
    expect(screen.queryByLabelText('İlk sayfa')).toBeNull();
  });

  it('renders pagination controls when pagination=true and totalPages > 1', () => {
    render(<Table data={big} columns={cols} pagination pageSize={10} />);
    expect(screen.getByLabelText('İlk sayfa')).toBeInTheDocument();
    expect(screen.getByLabelText('Sonraki sayfa')).toBeInTheDocument();
    expect(screen.getByText(/Sayfa 1 \/ 3/)).toBeInTheDocument();
  });

  it('only shows pageSize rows on page 1', () => {
    render(<Table data={big} columns={cols} pagination pageSize={10} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
  });

  it('navigating to last page shows the remaining rows', async () => {
    const user = userEvent.setup();
    render(<Table data={big} columns={cols} pagination pageSize={10} />);
    await user.click(screen.getByLabelText('Son sayfa'));
    expect(screen.getByText(/Sayfa 3 \/ 3/)).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
  });

  it('first/prev are disabled on page 1, next/last on the last page', async () => {
    const user = userEvent.setup();
    render(<Table data={big} columns={cols} pagination pageSize={10} />);
    expect(screen.getByLabelText('İlk sayfa')).toBeDisabled();
    expect(screen.getByLabelText('Önceki sayfa')).toBeDisabled();

    await user.click(screen.getByLabelText('Son sayfa'));
    expect(screen.getByLabelText('Sonraki sayfa')).toBeDisabled();
    expect(screen.getByLabelText('Son sayfa')).toBeDisabled();
  });

  it('hides pagination when there is only one page worth of data', () => {
    render(<Table data={sample} columns={cols} pagination pageSize={10} />);
    expect(screen.queryByLabelText('İlk sayfa')).toBeNull();
  });
});

describe('Table — row click', () => {
  it('fires onRowClick with the row data when clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<Table data={sample} columns={cols} onRowClick={onRowClick} />);
    const firstBodyRow = screen.getAllByRole('row')[1];
    await user.click(firstBodyRow);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(sample[0]);
  });

  it('does not break when onRowClick is not supplied', async () => {
    const user = userEvent.setup();
    render(<Table data={sample} columns={cols} />);
    const firstBodyRow = screen.getAllByRole('row')[1];
    expect(() => user.click(firstBodyRow)).not.toThrow();
  });

  it('applies rowClassName for per-row decoration', () => {
    render(
      <Table
        data={sample}
        columns={cols}
        rowClassName={(r) => (r.score > 90 ? 'highlight-row' : '')}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    // Cem has score 95 — index 2 in sample
    expect(rows[2].className).toContain('highlight-row');
    // Ali has score 70 — no highlight
    expect(rows[1].className).not.toContain('highlight-row');
  });
});
