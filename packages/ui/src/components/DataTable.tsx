import type { HTMLAttributes, ReactNode } from 'react';
import EmptyState from './EmptyState';
import LoadingIndicator from './LoadingIndicator';
import './SharedComponents.css';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Custom cell content. Falls back to `row[key]` for object rows. */
  render?: (row: T, index: number) => ReactNode;
  align?: 'start' | 'center' | 'end';
  headerClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowId?: (row: T, index: number) => string | number;
  /** Visually hidden table caption (also the table's accessible name). */
  caption?: string;
  emptyState?: ReactNode;
  loading?: boolean;
  sort?: DataTableSort;
  onSort?: (key: string) => void;
  /** Optional trailing actions column. */
  actions?: (row: T, index: number) => ReactNode;
  actionsHeader?: ReactNode;
}

const fallbackRowId = (row: unknown, index: number): string | number => {
  if (row !== null && typeof row === 'object' && 'id' in row) {
    const value = (row as { id?: unknown }).id;
    if (typeof value === 'string' || typeof value === 'number') return value;
  }
  return index;
};

function DataTable<T,>({
  className = '',
  columns,
  rows,
  getRowId = fallbackRowId,
  caption,
  emptyState,
  loading = false,
  sort,
  onSort,
  actions,
  actionsHeader,
  ...props
}: DataTableProps<T>) {
  const columnCount = columns.length + (actions ? 1 : 0);

  return (
    <div {...props} className={`angisoft-table-scroll${className ? ` ${className}` : ''}`}>
      <table className="angisoft-table">
        {caption ? <caption className="angisoft-table__caption">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              const ariaSort = isSorted
                ? sort?.direction === 'desc'
                  ? 'descending'
                  : 'ascending'
                : column.sortable
                  ? 'none'
                  : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  data-align={column.align}
                  className={column.headerClassName}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      className="angisoft-table__sort"
                      onClick={() => onSort(column.key)}
                    >
                      {column.header}
                      <span aria-hidden="true">
                        {isSorted ? (sort?.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {actions ? <th scope="col">{actionsHeader}</th> : null}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="angisoft-table__empty" colSpan={columnCount}>
                <EmptyState compact title="Loading…" icon={<LoadingIndicator size="sm" label="Loading" />} />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="angisoft-table__empty" colSpan={columnCount}>
                {emptyState ?? <EmptyState compact title="No records" />}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={getRowId(row, index)}>
                {columns.map((column) => {
                  const rawValue =
                    row !== null && typeof row === 'object'
                      ? (row as Record<string, unknown>)[column.key]
                      : undefined;
                  return (
                    <td key={column.key} data-align={column.align} className={column.cellClassName}>
                      {column.render ? column.render(row, index) : String(rawValue ?? '—')}
                    </td>
                  );
                })}
                {actions ? <td>{actions(row, index)}</td> : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
