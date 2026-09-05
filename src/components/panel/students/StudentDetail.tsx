"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/lib/use-api";
import type { StudentRow } from "@/types/api";
import { Badge, Card, DataRow, cx } from "@/components/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StudentStatus } from "@/components/panel/StudentStatus";
import { DownloadIcon, PencilIcon, TrashIcon } from "@/components/panel/icons";
import { Spinner } from "@/components/site/icons";

/**
 * One student's full record. The same component serves both panels; `scope`
 * decides which actions appear — a branch enters marks, head office approves
 * them.
 */
export function StudentDetail({
  student,
  scope,
}: {
  student: StudentRow;
  scope: "branch" | "admin";
}) {
  const router = useRouter();
  const { run, pending, error } = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const basePath = scope === "admin" ? "/admin-abc/students" : "/branch/students";
  const marks = Object.entries(student.marks_parsed);
  const canDelete = !student.is_certificate_approve && !student.certified_date;
  const canDownload = student.is_certificate_approve || student.marksheet_stage === "verified";

  async function remove() {
    const result = await run(`/api/students/${student.student_id}`, { method: "DELETE" });
    if (result.ok) {
      router.push(basePath);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {student.student_photo_src ? (
            <Image
              src={student.student_photo_src}
              alt=""
              width={72}
              height={84}
              unoptimized
              className="h-21 w-18 shrink-0 rounded-xl object-cover ring-1 ring-black/10"
              style={{ width: 72, height: 84 }}
            />
          ) : (
            <div className="flex h-21 w-18 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-[11px] text-neutral-500" style={{ width: 72, height: 84 }}>
              No photo
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <StudentStatus
                stage={student.marksheet_stage}
                certificateApproved={student.is_certificate_approve}
                active={student.is_student_active}
              />
              {student.is_student_active ? null : <Badge tone="red">Inactive</Badge>}
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
              {student.student_name}
            </h1>
            <p className="mt-0.5 font-mono text-sm text-neutral-500">
              {student.registration_number}
            </p>
            <p className="mt-1.5 text-sm text-neutral-600">
              {student.course_name} <span className="text-neutral-400">({student.short_form})</span>
              {scope === "admin" ? (
                <>
                  {" · "}
                  <Link
                    href={`/admin-abc/branches/${student.branch_id}`}
                    className="hover:underline"
                  >
                    {student.branch_name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {student.marksheet_stage !== "verified" ? (
            <ButtonLink
              href={
                scope === "admin"
                  ? `/admin-abc/students/${student.student_id}/marks`
                  : `/branch/marksheets/${student.student_id}`
              }
              variant="brand"
            >
              {student.marks ? "Update marks" : "Enter marks"}
            </ButtonLink>
          ) : null}

          <ButtonLink href={`${basePath}/${student.student_id}/edit`} variant="secondary">
            <PencilIcon className="h-4 w-4" />
            Edit
          </ButtonLink>

          {canDelete ? (
            <Button
              variant={confirmDelete ? "danger" : "secondary"}
              onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
              disabled={pending}
            >
              {pending ? (
                <Spinner className="h-4 w-4 animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
              {confirmDelete ? "Confirm delete" : "Delete"}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      {canDownload ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-emerald-200 bg-emerald-50/60">
          <div>
            <p className="text-sm font-semibold text-emerald-900">Documents are ready</p>
            <p className="mt-0.5 text-sm text-emerald-800">
              Marksheet no. {student.marksheet_id ?? "—"}
              {student.certified_date ? ` · certified ${student.certified_date}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {student.marksheet_stage === "verified" ? (
              <>
                <a
                  href={`/print/marksheet/${student.student_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-800 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50"
                >
                  Preview marksheet
                </a>
                <a
                  href={`/api/documents/marksheet/${student.student_id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Marksheet PDF
                </a>
              </>
            ) : null}
            {student.is_certificate_approve ? (
              <>
                <a
                  href={`/print/certificate/${student.student_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-800 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50"
                >
                  Preview certificate
                </a>
                <a
                  href={`/api/documents/certificate/${student.student_id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Certificate PDF
                </a>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Personal
          </h2>
          <dl>
            <DataRow label="Father's name" value={student.student_father_name || "—"} />
            <DataRow label="Mother's name" value={student.student_mother_name || "—"} />
            <DataRow label="Date of birth" value={student.dob} />
            <DataRow label="Phone" value={student.student_phone} />
            <DataRow label="Email" value={student.student_email || "—"} />
            <DataRow
              label="Aadhaar"
              value={
                student.aadhaar_number ? (
                  <span className="font-mono">{student.aadhaar_number}</span>
                ) : (
                  "—"
                )
              }
            />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Course & centre
          </h2>
          <dl>
            <DataRow label="Course" value={`${student.short_form} · ${student.course_duration} mo`} />
            <DataRow label="Admission" value={student.admission_date} />
            <DataRow label="Relieving" value={student.relieving_date} />
            <DataRow label="Branch" value={`${student.branch_name} (${student.branch_code})`} />
            <DataRow
              label="Address"
              value={
                [student.address, student.city, student.state, student.zip]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Fees
          </h2>
          <dl>
            <DataRow label="Total" value={money(student.total_fees)} />
            <DataRow label="Paid" value={money(student.paid_fees)} />
            <DataRow
              label="Balance"
              value={
                <span className={cx(Number(student.due_fees) > 0 && "text-red-600")}>
                  {money(student.due_fees)}
                </span>
              }
            />
          </dl>

          <h2 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Certification
          </h2>
          <dl>
            <DataRow label="Marksheet no." value={student.marksheet_id || "—"} />
            <DataRow label="Certified on" value={student.certified_date || "Not yet"} />
            <DataRow
              label="Overall"
              value={student.overall_percent === null ? "—" : `${student.overall_percent}%`}
            />
            <DataRow label="Performance" value={student.performance || "—"} />
          </dl>
        </Card>
      </div>

      {marks.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Marks
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {marks.map(([subject, value]) => (
              <div key={subject} className="rounded-xl bg-neutral-50 px-4 py-3">
                <p className="text-xs text-neutral-500">{subject}</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-neutral-900">
                  {value}
                  <span className="text-sm font-normal text-neutral-400"> / 100</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {student.verification_url ? (
        <Card>
          <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Public verification link
          </h2>
          <a
            href={student.verification_url}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-[13px] text-blue-600 hover:underline"
          >
            {student.verification_url}
          </a>
          <p className="mt-1.5 text-xs text-neutral-500">
            Printed on the marksheet as a QR code. Anyone with the registration number and date of
            birth can open it.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function money(value: number | null) {
  if (value === null) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
