"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation } from "@/lib/use-api";
import type { StudentRow } from "@/types/api";
import { Badge, Card, Field, SectionHeading, inputClass } from "@/components/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AlertIcon, CoinIcon } from "@/components/panel/icons";
import { Spinner } from "@/components/site/icons";

/** Mirrors the server's banding so the preview matches what gets saved. */
function band(percentage: number) {
  if (percentage >= 85) return { label: "Excellent", tone: "green" as const };
  if (percentage >= 60) return { label: "Very Good", tone: "blue" as const };
  if (percentage >= 30) return { label: "Good", tone: "amber" as const };
  return { label: "Failure", tone: "red" as const };
}

/**
 * Marks entry. The first marksheet for a student debits the branch's credit
 * balance; later corrections are free, so a typo does not cost money to fix —
 * that is why the warning only shows when there are no marks yet.
 */
export function MarksForm({
  student,
  credit,
  creditPerCertificate,
  scope = "branch",
}: {
  student: StudentRow;
  credit: number;
  creditPerCertificate: number;
  scope?: "branch" | "admin";
}) {
  const router = useRouter();
  const { run, pending, error } = useMutation();
  const studentPath = `${scope === "admin" ? "/admin-abc/students" : "/branch/students"}/${student.student_id}`;

  const subjects = student.course_subjects.length
    ? student.course_subjects
    : ["Written Marks", "Practical Marks", "Project Marks", "Viva Marks"];

  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      subjects.map((subject) => [
        subject,
        student.marks_parsed[subject] === undefined ? "" : String(student.marks_parsed[subject]),
      ]),
    ),
  );

  const isFirst = !student.marks;
  const chargeable = isFirst ? creditPerCertificate : 0;
  const cannotAfford = isFirst && credit < creditPerCertificate;

  const summary = useMemo(() => {
    const values = subjects.map((subject) => Number(marks[subject]));
    if (values.some((value) => marks[subjects[values.indexOf(value)]] === "" || !Number.isFinite(value))) {
      return null;
    }
    if (values.some((value) => value < 0 || value > 100)) return null;

    const total = values.reduce((sum, value) => sum + value, 0);
    const percentage = Math.round(((total / (values.length * 100)) * 100 + Number.EPSILON) * 100) / 100;
    return { percentage, ...band(percentage) };
  }, [marks, subjects]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const payload = Object.fromEntries(
      subjects.map((subject) => [subject, Number(marks[subject])]),
    );

    const result = await run(`/api/students/${student.student_id}/marksheet`, {
      method: "POST",
      body: { marks: payload },
    });

    if (result.ok) {
      router.push(studentPath);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <SectionHeading
        eyebrow={student.registration_number}
        title={`Marks — ${student.student_name}`}
        description={`${student.course_name} (${student.short_form}). Each subject is out of 100.`}
        actions={
          <ButtonLink href={studentPath} variant="secondary">
            Back to student
          </ButtonLink>
        }
      />

      {cannotAfford ? (
        <Card className="flex items-start gap-3 border-red-200 bg-red-50">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-900">Not enough credits</p>
            <p className="mt-0.5 text-sm text-red-800">
              A new marksheet costs {creditPerCertificate} credits and {student.branch_name} has{" "}
              {credit}.{" "}
              {scope === "admin"
                ? "Top the branch up from its branch page before submitting."
                : "Ask head office to top up before submitting."}
            </p>
          </div>
        </Card>
      ) : isFirst ? (
        <Card className="flex items-start gap-3 border-amber-200 bg-amber-50">
          <CoinIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              This will use {chargeable} credits
            </p>
            <p className="mt-0.5 text-sm text-amber-800">
              Charged once, when the marksheet is first created. Correcting these marks later is
              free. Balance after saving: {credit - chargeable}.
            </p>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((subject) => (
            <Field key={subject} label={subject} htmlFor={subject} required>
              <input
                id={subject}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step="0.01"
                required
                value={marks[subject] ?? ""}
                onChange={(event) =>
                  setMarks((current) => ({ ...current, [subject]: event.target.value }))
                }
                className={`${inputClass} text-lg font-semibold tabular-nums`}
              />
            </Field>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-neutral-100 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Overall
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-neutral-900">
              {summary ? `${summary.percentage}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Performance
            </p>
            <p className="mt-2">
              {summary ? <Badge tone={summary.tone}>{summary.label}</Badge> : <span className="text-neutral-400">—</span>}
            </p>
          </div>
          <p className="ml-auto max-w-xs text-xs leading-relaxed text-neutral-500">
            Saving sends the marksheet to head office for approval. It becomes printable once
            approved.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending || cannotAfford || !summary}>
          {pending ? (
            <>
              <Spinner className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save & send for approval"
          )}
        </Button>
        <Link
          href={studentPath}
          className="text-sm font-semibold text-neutral-500 hover:text-neutral-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
