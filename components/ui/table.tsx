"use client";

import type { ReactNode } from "react";
import { LoadingSkeleton } from "./loading-skeleton";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: string;
  /** Custom render function. Receives the row data and column key. */
  render?: (row: T, key: string) => ReactNode;
  /** Tailwind class for column width (eg. "w-32") */
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key extractor for each row */
  rowKey: (row: T) => string;
  /** Click handler for entire row */
  onRowClick?: (row: T) => void;
  /** Pagination state */
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  /** Loading state — renders skeleton rows */
  loading?: boolean;
  /** Error message — renders red error banner */
  error?: string | null;
  /** Empty state override text */
  emptyTitle?: string;
  emptyDescription?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  onRowClick,
  pagination,
  loading = false,
  error = null,
  emptyTitle = "No se encontraron registros",
  emptyDescription = "No hay datos para mostrar en este momento.",
}: TableProps<T>) {
  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-error-200 bg-error-50 p-6">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-error-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm font-medium text-error-700">{error}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="h-3 w-32 rounded-full bg-slate-200" />
        </div>
        <div className="p-5">
        <LoadingSkeleton rows={5} cols={columns.length} />
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)]">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`bg-white ${onRowClick ? "cursor-pointer transition-colors hover:bg-slate-50/80" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 align-middle text-slate-700 ${col.className ?? ""}`}>
                    {col.render
                      ? col.render(row, col.key)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-5 py-4">
          <p className="text-sm font-medium text-slate-600">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
