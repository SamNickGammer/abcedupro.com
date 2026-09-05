"use client";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import type { BranchDashboard } from "@/types/api";
import { Card, EmptyState, SectionHeading, StatTile } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/panel/DataTable";
import { StudentStatus } from "@/components/panel/StudentStatus";
import { AlertIcon, PlusIcon } from "@/components/panel/icons";
import type { StudentRow } from "@/types/api";

export function BranchDashboardView() {
  const { data, loading, error } = useApi<BranchDashboard>("/api/dashboard/branch");

  const stats = data?.stats;

  const columns: Column<StudentRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <Link
          href={`/branch/students/${row.student_id}`}
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
    { key: "course", header: "Course", render: (row) => row.short_form },
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
      key: "updated",
      header: "Updated",
      align: "right",
      render: (row) => (
        <span className="text-[13px] text-neutral-500">
          {new Date(row.updated_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={data?.branch.branch_code ?? ""}
        title={data?.branch.branch_name ?? "Dashboard"}
        description="Everything enrolled at this centre, and what still needs your attention."
        actions={
          <ButtonLink href="/branch/students/new" variant="primary">
            <PlusIcon className="h-4 w-4" />
            Enrol a student
          </ButtonLink>
        }
      />

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-semibold text-red-800">Could not load the dashboard</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      {stats && stats.certificates_affordable === 0 ? (
        <Card className="flex items-start gap-3 border-amber-200 bg-amber-50">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Out of credits</p>
            <p className="mt-0.5 text-sm text-amber-800">
              A new marksheet costs {stats.credit_per_certificate} credits and this branch has{" "}
              {stats.credit}. Ask head office to top up before entering more marks.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Total students" value={loading ? "—" : (stats?.total_students ?? 0)} />
        <StatTile
          label="Awaiting approval"
          value={loading ? "—" : (stats?.pending_students ?? 0)}
          tone={stats?.pending_students ? "amber" : "neutral"}
          hint="Marksheets sent to head office"
        />
        <StatTile
          label="Certified"
          value={loading ? "—" : (stats?.certified_students ?? 0)}
          tone="green"
        />
        <StatTile label="Active" value={loading ? "—" : (stats?.active_students ?? 0)} />
        <StatTile
          label="Credits"
          value={loading ? "—" : (stats?.credit ?? 0).toLocaleString("en-IN")}
          tone={
            !stats ? "neutral" : stats.certificates_affordable === 0 ? "red" : stats.certificates_affordable <= 2 ? "amber" : "green"
          }
          hint={
            stats
              ? `${stats.certificates_affordable} more certificate${stats.certificates_affordable === 1 ? "" : "s"}`
              : undefined
          }
        />
      </div>

      <div>
        <SectionHeading
          title="Recently updated"
          actions={
            <ButtonLink href="/branch/students" variant="secondary" size="sm">
              View all students
            </ButtonLink>
          }
        />
        <DataTable
          columns={columns}
          rows={data?.recent_students ?? []}
          rowKey={(row) => row.student_id}
          loading={loading}
          empty={
            <EmptyState
              title="No students yet"
              description="Enrol your first student to see them here."
              action={
                <ButtonLink href="/branch/students/new">
                  <PlusIcon className="h-4 w-4" />
                  Enrol a student
                </ButtonLink>
              }
            />
          }
        />
      </div>
    </div>
  );
}
