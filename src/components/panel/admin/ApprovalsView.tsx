"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi, useMutation } from "@/lib/use-api";
import { query } from "@/lib/client";
import type { StudentRow } from "@/types/api";
import { Badge, Card, EmptyState, Field, SectionHeading, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { DataTable, Paginator, type Column, type Pagination } from "@/components/panel/DataTable";
import { SearchIcon } from "@/components/panel/icons";
import { Spinner } from "@/components/site/icons";

/**
 * The approval queue: marksheets a branch has submitted, waiting on head
 * office. Approving allocates the next marksheet number, stamps the certified
 * date and moves the student to `verified`, which is what makes the certificate
 * and marksheet printable.
 */
export function ApprovalsView() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StudentRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debounced]);

  const path = `/api/students${query({
    list_type: "certificate_pending",
    search: debounced,
    page,
    per_page: 20,
  })}`;

  const { data, extra, loading, error, refresh } = useApi<StudentRow[]>(path);
  const pagination = extra.pagination as Pagination | undefined;

  const columns: Column<StudentRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div className="min-w-0">
          <Link
            href={`/admin-abc/students/${row.student_id}`}
            className="block truncate font-semibold text-neutral-900 hover:underline"
          >
            {row.student_name}
          </Link>
          <p className="truncate font-mono text-xs text-neutral-500">{row.registration_number}</p>
        </div>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      render: (row) => (
        <span className="whitespace-nowrap text-[13px]">
          {row.branch_name}
          <span className="ml-1.5 font-mono text-xs text-neutral-400">{row.branch_code}</span>
        </span>
      ),
    },
    { key: "course", header: "Course", render: (row) => row.short_form },
    {
      key: "marks",
      header: "Marks",
      render: (row) => (
        <span className="font-mono text-xs text-neutral-600">
          {Object.values(row.marks_parsed).join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "percent",
      header: "Overall",
      align: "right",
      render: (row) => (
        <span className="font-semibold tabular-nums">
          {row.overall_percent === null ? "—" : `${row.overall_percent}%`}
        </span>
      ),
    },
    {
      key: "performance",
      header: "Performance",
      render: (row) => (
        <Badge
          tone={
            row.performance === "Excellent"
              ? "green"
              : row.performance === "Very Good"
                ? "blue"
                : row.performance === "Good"
                  ? "amber"
                  : "red"
          }
        >
          {row.performance || "—"}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (row) => (
        <Button size="sm" variant="success" onClick={() => setSelected(row)}>
          Approve
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Head office"
        title="Certificate approvals"
        description="Marksheets submitted by branches. Approving one issues its marksheet number and makes the documents printable."
      />

      <Card padded={false} className="p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, registration number or branch"
            aria-label="Search pending approvals"
            className={`${inputClass} pl-9`}
          />
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
            title="Nothing waiting for approval"
            description="Marksheets submitted by branches appear here."
          />
        }
      />

      {pagination ? <Paginator pagination={pagination} onPage={setPage} /> : null}

      {selected ? (
        <ApproveDialog
          student={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ApproveDialog({
  student,
  onClose,
  onDone,
}: {
  student: StudentRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { run, pending, error } = useMutation();
  const [certifiedDate, setCertifiedDate] = useState(new Date().toISOString().slice(0, 10));
  const [marksheetId, setMarksheetId] = useState("");

  // Escape closes, as a dialog should.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function approve() {
    const result = await run(`/api/students/${student.student_id}/certification`, {
      method: "POST",
      body: {
        certified_date: certifiedDate,
        ...(marksheetId ? { marksheet_id: marksheetId } : {}),
      },
    });

    if (result.ok) onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Approve certificate"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">Approve certificate</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {student.student_name} · <span className="font-mono">{student.registration_number}</span>
        </p>

        <dl className="my-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm">
          <div className="flex justify-between py-1">
            <dt className="text-neutral-500">Overall</dt>
            <dd className="font-semibold tabular-nums">{student.overall_percent}%</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-neutral-500">Performance</dt>
            <dd className="font-semibold">{student.performance}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-neutral-500">Branch</dt>
            <dd className="font-semibold">{student.branch_name}</dd>
          </div>
        </dl>

        <div className="space-y-4">
          <Field label="Certified date" htmlFor="certified" required>
            <input
              id="certified"
              type="date"
              required
              value={certifiedDate}
              onChange={(event) => setCertifiedDate(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Marksheet number"
            htmlFor="msid"
            hint="Leave blank to take the next number in the sequence"
          >
            <input
              id="msid"
              value={marksheetId}
              onChange={(event) => setMarksheetId(event.target.value)}
              placeholder="Auto"
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="success" onClick={approve} disabled={pending}>
            {pending ? (
              <>
                <Spinner className="h-4 w-4 animate-spin" />
                Approving
              </>
            ) : (
              "Approve certificate"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
