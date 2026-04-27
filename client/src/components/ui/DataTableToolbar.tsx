import { Plus, Search } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Input } from './Input';
import { Button } from './Button';
import { Chip } from './Chip';

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  /** Column id to drive the global search. */
  searchColumn?: string;
  searchPlaceholder?: string;
  /** Active filter chips — clicking the X clears the column filter. */
  filterChips?: Array<{ columnId: string; label: string }>;
  /** Optional "+ Yeni Kayıt" handler. Hidden if undefined. */
  onCreate?: () => void;
  createLabel?: string;
}

export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchPlaceholder = 'Ara…',
  filterChips,
  onCreate,
  createLabel = 'Yeni Kayıt',
}: DataTableToolbarProps<TData>) {
  const searchValue = searchColumn
    ? ((table.getColumn(searchColumn)?.getFilterValue() as string | undefined) ?? '')
    : '';

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {searchColumn && (
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
            />
            <Input
              value={searchValue}
              onChange={(e) => table.getColumn(searchColumn)?.setFilterValue(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-6"
            />
          </div>
        )}
        {filterChips && filterChips.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {filterChips.map((chip) => (
              <button
                key={chip.columnId}
                type="button"
                onClick={() => table.getColumn(chip.columnId)?.setFilterValue(undefined)}
                className="inline-flex"
                aria-label={`${chip.label} filtresini kaldır`}
              >
                <Chip tone="state">{chip.label} ✕</Chip>
              </button>
            ))}
          </div>
        )}
      </div>
      {onCreate && (
        <Button variant="primary" size="sm" onClick={onCreate}>
          <Plus size={14} />
          {createLabel}
        </Button>
      )}
    </div>
  );
}
