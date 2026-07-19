import {
  forwardRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cn } from '../../utils/cn';

/**
 * Devlet "TABLO" semantic primitives — flat, ruled, mono headers.
 *
 * Used for ministerial-style document tables (resmi belge görünümü).
 * The richer sortable/filterable DataTable will be PR-11 (TanStack
 * Table); this file owns only the visual primitives.
 */
export const DocumentTable = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table
      ref={ref}
      className={cn('w-full caption-top text-sm border-collapse', className)}
      {...props}
    />
  ),
);
DocumentTable.displayName = 'DocumentTable';

export const DocumentTableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mb-3 text-sm font-medium text-[var(--ink-2)] text-left', className)}
    {...props}
  />
));
DocumentTableCaption.displayName = 'DocumentTableCaption';

export const DocumentTableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-0', className)} {...props} />
));
DocumentTableHeader.displayName = 'DocumentTableHeader';

export const DocumentTableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
DocumentTableBody.displayName = 'DocumentTableBody';

export const DocumentTableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-[var(--rule)] hover:bg-[var(--surface-2)] transition-colors',
      className,
    )}
    {...props}
  />
));
DocumentTableRow.displayName = 'DocumentTableRow';

export const DocumentTableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-9 px-[18px] text-left align-middle text-[11.5px] font-bold uppercase tracking-wide text-[var(--ink-dim)] bg-[var(--surface-2)]',
      className,
    )}
    {...props}
  />
));
DocumentTableHead.displayName = 'DocumentTableHead';

export const DocumentTableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('h-[42px] px-[18px] align-middle text-[var(--ink-2)]', className)}
    {...props}
  />
));
DocumentTableCell.displayName = 'DocumentTableCell';
