import { useState, type ReactNode } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type Table,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  DocumentTable,
  DocumentTableBody,
  DocumentTableCaption,
  DocumentTableCell,
  DocumentTableHead,
  DocumentTableHeader,
  DocumentTableRow,
} from './DocumentTable';
import { DataTablePagination } from './DataTablePagination';
import { cn } from '../../utils/cn';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  caption?: string;
  pageSize?: number;
  /** Hide pagination controls when data is small. */
  paginated?: boolean;
  /** Slot above the table — toolbar with search, filter chips, etc. */
  toolbar?: ReactNode;
  /** Empty-state copy (defaults to "Kayıt bulunamadı"). */
  emptyState?: ReactNode;
}

/**
 * Devlet veri tablosu — TanStack Table v8 üzerine kurulu, DocumentTable
 * primitive'lerini kullanır. Sıralama, filtreleme, sayfalama, sütun
 * görünürlük yönetimi yerleşik.
 *
 * Daha karmaşık özellikler (URL-synced filters, virtualization) sayfa
 * migrasyonları sırasında ihtiyaç duyuldukça eklenecek.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  caption,
  pageSize = 20,
  paginated = true,
  toolbar,
  emptyState = 'Kayıt bulunamadı',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className="space-y-3">
      {toolbar}
      <DocumentTable>
        {caption && <DocumentTableCaption>{caption}</DocumentTableCaption>}
        <DocumentTableHeader>
          {table.getHeaderGroups().map((group) => (
            <DocumentTableRow key={group.id}>
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                return (
                  <DocumentTableHead
                    key={header.id}
                    className={canSort ? 'cursor-pointer select-none' : undefined}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon dir={dir} />}
                    </span>
                  </DocumentTableHead>
                );
              })}
            </DocumentTableRow>
          ))}
        </DocumentTableHeader>
        <DocumentTableBody>
          {table.getRowModel().rows.length === 0 ? (
            <DocumentTableRow>
              <DocumentTableCell
                colSpan={columns.length}
                className="text-center font-serif text-[var(--ink-dim)] py-8"
              >
                {emptyState}
              </DocumentTableCell>
            </DocumentTableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <DocumentTableRow
                key={row.id}
                className={cn(row.getIsSelected() && 'bg-[var(--surface-2)]')}
              >
                {row.getVisibleCells().map((cell) => (
                  <DocumentTableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </DocumentTableCell>
                ))}
              </DocumentTableRow>
            ))
          )}
        </DocumentTableBody>
      </DocumentTable>
      {paginated && <DataTablePagination table={table} />}
    </div>
  );
}

function SortIcon({ dir }: { dir: false | 'asc' | 'desc' }) {
  if (dir === 'asc') return <ChevronUp size={12} className="text-[var(--ink)]" />;
  if (dir === 'desc') return <ChevronDown size={12} className="text-[var(--ink)]" />;
  return <ChevronsUpDown size={12} className="text-[var(--ink-dim-2)]" />;
}

export type { Table } from '@tanstack/react-table';
