"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/use-api";
import { query } from "@/lib/client";
import type { BranchRow, StudentRow } from "@/types/api";
import { Card, EmptyState, cx, inputClass } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, Paginator, type Column, type Pagination } from "@/components/panel/DataTable";
import { StudentStatus } from "@/components/panel/StudentStatus";
import { PlusIcon, SearchIcon } from "@/components/panel/icons";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "no_cert", label: "Not certified" },
  { id: "pending", label: "Awaiting approval" },
  { id: "verified", label: "Verified" },
  { id: "certified", label: "Certified" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

/**
 * The student roll, shared by both panels. `basePath` decides where rows link
 * to; `showBranch` adds the branch column that only head office needs.
 *
 * Scope is never passed from here — the API derives it from the session, so a
 * branch cannot widen its own listing by editing a query parameter.
 */
export function StudentsBrowser({
  basePath,
  showBranch = false,
  listType = "all",
  title,
  description,
}: {
  basePath: string;
  showBranch?: boolean;
  listType?: "all" | "certificate_pending";
  title: string;
  description?: string;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<Filter>("all");
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);

  // Debounced so a search fires once the typist pauses, not per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status, branchId]);

  const path = `/api/students${query({
    search: debounced,
    status,
    list_type: listType,
    branch_id: branchId,
    page,
    per_page: 20,
  })}`;

  const { data, extra, loading, error } = useApi<StudentRow[]>(path);
  const pagination = extra.pagination as Pagination | undefined;

  // Only head office gets the branch picker, and only it can read /api/branches.
  const { data: branches } = useApi<BranchRow[]>(showBranch ? "/api/branches" : null);

  const columns = useMemo(() => {
    const list: Column<StudentRow>[] = [
      {
        key: "student",
        header: "Student",
        render: (row) => (
          <div className="min-w-0">
            <Link
              href={`${basePath}/${row.student_id}`}
              className="block truncate font-semibold text-neutral-900 hover:underline"
            >
              {row.student_name}
            </Link>
            <p className="truncate text-xs text-neutral-500">
              {row.student_father_name ? `s/o ${row.student_father_name}` : row.student_phone}
            </p>
          </div>
        ),
      },
      {
        key: "reg",
        header: "Registration",
        render: (row) => <span className="font-mono text-[13px]">{row.registration_number}</span>,
      },
      {
        key: "course",
        header: "Course",
        render: (row) => (
          <span title={row.course_name} className="whitespace-nowrap">
            {row.short_form}
          </span>
        ),
      },
    ];

    if (showBranch) {
      list.push({
        key: "branch",
        header: "Branch",
        render: (row) => (
          <span className="whitespace-nowrap text-[13px]">
            {row.branch_name}
            <span className="ml-1.5 font-mono text-xs text-neutral-400">{row.branch_code}</span>
          </span>
        ),
      });
    }

    list.push(
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <StudentStatus
            stage={row.marksheet_stage}
            certificateApproved={row.is_certificate_approve}
            active={row.is_student_active}
          />
        ),
      },
      {
        key: "percent",
        header: "Overall",
        align: "right",
        render: (row) =>
          row.overall_percent === null ? (
            <span className="text-neutral-300">—</span>
          ) : (
            <span className="font-semibold">{row.overall_percent}%</span>
          ),
      },
      {
        key: "updated",
        header: "Updated",
        align: "right",
        render: (row) => (
          <span className="whitespace-nowrap text-[13px] text-neutral-500">
            {new Date(row.updated_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
    );

    return list;
  }, [basePath, showBranch]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-neutral-600">{description}</p> : null}
        </div>
        {basePath.startsWith("/branch") ? (
          <ButtonLink href="/branch/students/new">
            <PlusIcon className="h-4 w-4" />
            Enrol a student
          </ButtonLink>
        ) : null}
      </div>

      <Card padded={false} className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, registration number, phone or course"
              aria-label="Search students"
              className={`${inputClass} pl-9`}
            />
          </div>

          {showBranch ? (
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              aria-label="Filter by branch"
              className={`${inputClass} w-auto min-w-[180px]`}
            >
              <option value="">All branches</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branchName} ({branch.branchCode})
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatus(filter.id)}
              className={cx(
                "rounded-full px-3 py-1.5 text-[13px] font-semibold transition",
                status === filter.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(row) => row.student_id}
        loading={loading}
        empty={
          <EmptyState
            title={debounced || status !== "all" ? "No students match those filters" : "No students yet"}
            description={
              debounced || status !== "all"
                ? "Try a different search term or clear the filters."
                : "Students appear here once they are enrolled."
            }
          />
        }
      />

      {pagination ? <Paginator pagination={pagination} onPage={setPage} /> : null}
    </div>
  );
}
