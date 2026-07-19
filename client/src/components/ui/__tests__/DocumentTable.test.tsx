import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DocumentTable,
  DocumentTableBody,
  DocumentTableCaption,
  DocumentTableCell,
  DocumentTableHead,
  DocumentTableHeader,
  DocumentTableRow,
} from '../DocumentTable';

const renderTable = () =>
  render(
    <DocumentTable data-testid="t">
      <DocumentTableCaption>Tablo I</DocumentTableCaption>
      <DocumentTableHeader>
        <DocumentTableRow>
          <DocumentTableHead>Konu</DocumentTableHead>
          <DocumentTableHead>Durum</DocumentTableHead>
        </DocumentTableRow>
      </DocumentTableHeader>
      <DocumentTableBody>
        <DocumentTableRow>
          <DocumentTableCell>Matematik</DocumentTableCell>
          <DocumentTableCell>Onaylandı</DocumentTableCell>
        </DocumentTableRow>
      </DocumentTableBody>
    </DocumentTable>,
  );

describe('DocumentTable primitives', () => {
  it('renders a single <table> element with the expected structure', () => {
    renderTable();
    expect(screen.getByRole('table')).toBeInTheDocument();
    // caption renders inline as part of the table element rather than role=caption,
    // but its text is queryable directly.
    expect(screen.getByText('Tablo I')).toBeInTheDocument();
  });

  it('renders <th> for column headers and <td> for body cells', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: 'Konu' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Durum' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Matematik' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Onaylandı' })).toBeInTheDocument();
  });

  it('applies the Soft Modern header styling on <th> (uppercase, surface-2 bg)', () => {
    renderTable();
    const th = screen.getByRole('columnheader', { name: 'Konu' });
    expect(th.className).toContain('uppercase');
    expect(th.className).toContain('font-bold');
    expect(th.className).toContain('bg-[var(--surface-2)]');
    // No mono ministerial header styling.
    expect(th.className).not.toContain('font-mono');
  });

  it('forwards user className to the table element', () => {
    render(
      <DocumentTable className="extra-token">
        <DocumentTableBody />
      </DocumentTable>,
    );
    expect(screen.getByRole('table').className).toContain('extra-token');
  });

  it('rows render with a hover surface transition by default', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    // First row is in thead, second is the body row
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const bodyRow = rows[rows.length - 1];
    expect(bodyRow.className).toContain('hover:bg-[var(--surface-2)]');
  });
});
