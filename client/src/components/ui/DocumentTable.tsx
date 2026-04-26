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
    className={cn(
      'mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-dim)] text-left',
      className,
    )}
    {...props}
  />
));
DocumentTableCaption.displayName = 'DocumentTableCaption';

export const DocumentTableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('border-b-2 border-[var(--ink)] [&_tr]:border-0', className)}
    {...props}
  />
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
      'border-b border-[var(--rule)] hover:bg-[var(--surface)] transition-colors',
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
      'h-10 px-3 text-left align-middle font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)] font-semibold',
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
    className={cn('h-12 px-3 align-middle text-[var(--ink-2)]', className)}
    {...props}
  />
));
DocumentTableCell.displayName = 'DocumentTableCell';
