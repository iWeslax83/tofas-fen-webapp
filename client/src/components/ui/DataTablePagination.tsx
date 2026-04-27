import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Button } from './Button';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(totalRows, (pageIndex + 1) * pageSize);
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
        {selectedCount > 0 && `${selectedCount} seçili · `}
        {start}–{end} / {totalRows}
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
          Sayfa
          <select
            className="bg-transparent border border-[var(--rule)] px-2 py-1 font-mono text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--state)]"
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="İlk sayfa"
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)] px-2">
            {pageIndex + 1} / {pageCount || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Son sayfa"
          >
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
