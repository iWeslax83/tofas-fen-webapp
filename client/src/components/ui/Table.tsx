import React, { useState, useMemo, ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Table.css';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

export const Table = <T extends Record<string, any>>({
  data,
  columns,
  sortable = true,
  filterable = false,
  pagination = false,
  pageSize = 10,
  className = '',
  emptyMessage = 'Veri bulunamadı',
  loading = false,
  onRowClick,
  rowClassName,
}: TableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering
  const filteredData = useMemo(() => {
    if (!filterable || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter((row) => {
      return columns.every((column) => {
        const filterValue = filters[column.key];
        if (!filterValue) return true;

        const cellValue = column.accessor
          ? column.accessor(row)
          : row[column.key];

        return String(cellValue || '')
          .toLowerCase()
          .includes(filterValue.toLowerCase());
      });
    });
  }, [data, filters, columns, filterable]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortable) {
      return filteredData;
    }

    const sorted = [...filteredData].sort((a, b) => {
      const column = columns.find((col) => col.key === sortConfig.key);
      if (!column) return 0;

      const aValue = column.accessor ? column.accessor(a) : a[sortConfig.key];
      const bValue = column.accessor ? column.accessor(b) : b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr, 'tr');
      } else {
        return bStr.localeCompare(aStr, 'tr');
      }
    });

    return sorted;
  }, [filteredData, sortConfig, columns, sortable]);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) {
      return sortedData;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    if (!sortable) return;

    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null;
        }
      }
      return { key, direction: 'asc' };
    });
  };

  const handleFilter = (key: string, value: string) => {
    setFilters((current) => {
      if (!value) {
        const newFilters = { ...current };
        delete newFilters[key];
        return newFilters;
      }
      return { ...current, [key]: value };
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getCellValue = (column: TableColumn<T>, row: T) => {
    if (column.render) {
      const value = column.accessor ? column.accessor(row) : row[column.key];
      return column.render(value, row);
    }
    return column.accessor ? column.accessor(row) : row[column.key];
  };

  if (loading) {
    return (
      <div className="table-loading">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={`table-wrapper ${className}`}>
      <table className="table">
        <thead className="table-header">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`table-header-cell ${column.sortable && sortable ? 'table-header-cell-sortable' : ''} ${column.align ? `table-header-cell-${column.align}` : ''} ${column.className || ''}`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="table-header-cell-content">
                  <span>{column.header}</span>
                  {column.sortable && sortable && (
                    <span className="table-sort-icon">
                      {sortConfig?.key === column.key ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp size={16} />
                        ) : (
                          <ArrowDown size={16} />
                        )
                      ) : (
                        <ArrowUpDown size={16} />
                      )}
                    </span>
                  )}
                </div>
                {column.filterable && filterable && (
                  <input
                    type="text"
                    className="table-filter-input"
                    placeholder="Filtrele..."
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilter(column.key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            paginatedData.map((row, index) => (
              <tr
                key={index}
                className={`table-row ${onRowClick ? 'table-row-clickable' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`table-cell ${column.align ? `table-cell-${column.align}` : ''} ${column.className || ''}`}
                  >
                    {getCellValue(column, row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && totalPages > 1 && (
        <div className="table-pagination">
          <div className="table-pagination-info">
            <span>
              {((currentPage - 1) * pageSize + 1)} -{' '}
              {Math.min(currentPage * pageSize, sortedData.length)} /{' '}
              {sortedData.length}
            </span>
          </div>
          <div className="table-pagination-controls">
            <button
              type="button"
              className="table-pagination-button"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              aria-label="İlk sayfa"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              className="table-pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Önceki sayfa"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="table-pagination-page">
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="table-pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Sonraki sayfa"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="table-pagination-button"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Son sayfa"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;

