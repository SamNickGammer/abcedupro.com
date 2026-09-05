"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import type { AdminDashboard, StudentRow } from "@/types/api";
import { Badge, Card, EmptyState, SectionHeading, StatTile } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/panel/DataTable";
import { StudentStatus } from "@/components/panel/StudentStatus";
import { PlusIcon } from "@/components/panel/icons";

export function AdminDashboardView() {
  const { data, loading, error } = useApi<AdminDashboard>("/api/dashboard/admin");
  const stats = data?.stats;

  const studentColumns: Column<StudentRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <Link
          href={`/admin-abc/students/${row.student_id}`}
          className="font-semibold text-neutral-900 hover:underline"
        >
          {row.student_name}
        </Link>
      ),
    },
    {
      key: "reg",
      header: "Registration",
      render: (row) => <span className="font-mono text-[13px]">{row.registration_number}</span>,
    },
    {
      key: "branch",
      header: "Branch",
      render: (row) => <span className="whitespace-nowrap text-[13px]">{row.branch_name}</span>,
    },
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
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Head office"
        title="Dashboard"
        description="Everything across every branch, and what is waiting on you."
        actions={
          <>
            <ButtonLink href="/admin-abc/approvals" variant="brand">
              Review approvals
              {stats?.pending_students ? (
                <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-xs tabular-nums">
                  {stats.pending_students}
                </span>
              ) : null}
            </ButtonLink>
            <ButtonLink href="/admin-abc/branches/new" variant="secondary">
              <PlusIcon className="h-4 w-4" />
              New branch
            </ButtonLink>
          </>
        }
      />

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Total students" value={loading ? "—" : (stats?.total_students ?? 0)} />
        <StatTile
          label="Awaiting approval"
          value={loading ? "—" : (stats?.pending_students ?? 0)}
          tone={stats?.pending_students ? "amber" : "neutral"}
          hint="Marksheets from branches"
        />
        <StatTile
          label="Certified"
          value={loading ? "—" : (stats?.certified_students ?? 0)}
          tone="green"
        />
        <StatTile
          label="Branches"
          value={loading ? "—" : (stats?.total_branches ?? 0)}
          hint={stats ? `${stats.active_branches} active` : undefined}
        />
        <StatTile label="Courses" value={loading ? "—" : (stats?.total_courses ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading
            title="Recently updated"
            actions={
              <ButtonLink href="/admin-abc/students" variant="secondary" size="sm">
                All students
              </ButtonLink>
            }
          />
          <DataTable
            columns={studentColumns}
            rows={data?.recent_students ?? []}
            rowKey={(row) => row.student_id}
            loading={loading}
            empty={<EmptyState title="No students yet" />}
          />
        </div>

        <div>
          <SectionHeading
            title="Branches"
            actions={
              <ButtonLink href="/admin-abc/branches" variant="secondary" size="sm">
                Manage
              </ButtonLink>
            }
          />
          <Card padded={false} className="divide-y divide-neutral-100">
            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, index) => (
                  <span key={index} className="block h-4 animate-pulse rounded bg-neutral-200/80" />
                ))}
              </div>
            ) : data?.branches.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No branches yet"
                  description="Create the first franchise centre to get started."
                  action={
                    <ButtonLink href="/admin-abc/branches/new">
                      <PlusIcon className="h-4 w-4" />
                      New branch
                    </ButtonLink>
                  }
                />
              </div>
            ) : (
              data?.branches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/admin-abc/branches/${branch.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {branch.branch_name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      <span className="font-mono uppercase">{branch.branch_code}</span> ·{" "}
                      {branch.city}, {branch.state} · {branch.total_students} student
                      {branch.total_students === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {branch.active ? null : <Badge tone="red">Suspended</Badge>}
                    <Badge
                      tone={
                        branch.credit < branch.credit_per_certificate
                          ? "red"
                          : branch.credit < branch.credit_per_certificate * 3
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {branch.credit.toLocaleString("en-IN")} cr
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
