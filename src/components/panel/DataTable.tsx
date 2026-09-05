"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "@/components/panel/icons";

export type Column<Row> = {
  key: string;
  header: string;
  /** Right-aligned for numbers, so digits line up down the column. */
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: Row) => ReactNode;
};

export type Pagination = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: Row) => void;
}) {
  if (!loading && rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className="table-scroll rounded-2xl border border-black/[0.07] bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50/80">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500",
                  column.align === "right"
                    ? "text-right"
                    : column.align === "center"
                      ? "text-center"
                      : "text-left",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <tr key={`skeleton-${index}`} className="border-b border-neutral-100 last:border-b-0">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3.5">
                      <span className="block h-3.5 animate-pulse rounded bg-neutral-200/80" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    "border-b border-neutral-100 last:border-b-0",
                    onRowClick && "cursor-pointer transition hover:bg-neutral-50",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        "px-4 py-3.5 align-middle text-neutral-800",
                        column.align === "right"
                          ? "text-right tabular-nums"
                          : column.align === "center"
                            ? "text-center"
                            : "text-left",
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export function Paginator({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (page: number) => void;
}) {
  const { current_page: page, last_page: lastPage, total, from, to } = pagination;

  if (total === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-neutral-500">
        Showing <span className="font-semibold text-neutral-800">{from ?? 0}</span>–
        <span className="font-semibold text-neutral-800">{to ?? 0}</span> of{" "}
        <span className="font-semibold text-neutral-800">{total.toLocaleString("en-IN")}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="px-2 text-[13px] tabular-nums text-neutral-500">
          {page} / {lastPage}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= lastPage}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
