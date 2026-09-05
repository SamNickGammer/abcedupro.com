"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Card, DataRow, Field, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";

type VerifiedStudent = {
  student_name: string;
  registration_number: string;
  student_father_name: string | null;
  student_mother_name: string | null;
  dob: string;
  student_phone: string;
  student_email: string;
  aadhaar_number: string;
  city: string | null;
  state: string | null;
  admission_date: string;
  relieving_date: string;
  student_photo_src: string | null;
  marksheet_id: string | null;
  marksheet_stage: "started" | "pending" | "verified";
  marks: Record<string, number>;
  overall_percent: number | null;
  performance: string;
  certified_date: string | null;
  is_certificate_approve: boolean;
  is_student_active: boolean;
  course_name: string;
  short_form: string;
  course_duration: number;
  branch_code: string;
  branch_name: string;
  branch_city: string | null;
  branch_state: string | null;
  branch_phone: string | null;
};

export function VerifyForm({
  initialRegistrationNumber,
  initialDob,
}: {
  initialRegistrationNumber: string;
  initialDob: string;
}) {
  const [registrationNumber, setRegistrationNumber] = useState(initialRegistrationNumber);
  const [dob, setDob] = useState(initialDob);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<VerifiedStudent | null>(null);

  const lookup = useCallback(async (rn: string, birthDate: string) => {
    setStatus("loading");
    setError(null);
    setStudent(null);

    try {
      const response = await fetch("/api/public/student", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registration_number: rn.trim(), dob: birthDate }),
      });

      const result = (await response.json()) as
        | { error: false; data: VerifiedStudent }
        | { error: true; message: string };

      if (result.error) {
        setError(result.message);
      } else {
        setStudent(result.data);
      }
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setStatus("done");
    }
  }, []);

  // A certificate's printed link arrives with both values already filled in, so
  // the visitor sees the result rather than a form they have to re-submit.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    if (initialRegistrationNumber && initialDob) {
      autoRan.current = true;
      void lookup(initialRegistrationNumber, initialDob);
    }
  }, [initialRegistrationNumber, initialDob, lookup]);

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void lookup(registrationNumber, dob);
          }}
          className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registration number" htmlFor="rn" required>
              <input
                id="rn"
                name="rn"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. PAT0001"
                value={registrationNumber}
                onChange={(event) => setRegistrationNumber(event.target.value)}
                className={`${inputClass} uppercase`}
              />
            </Field>
            <Field label="Date of birth" htmlFor="dob" required>
              <input
                id="dob"
                name="dob"
                type="date"
                required
                value={dob}
                onChange={(event) => setDob(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Button type="submit" size="lg" disabled={status === "loading"} className="sm:mb-0.5">
            {status === "loading" ? (
              <>
                <Spinner className="h-4 w-4 animate-spin" />
                Checking
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </form>
      </Card>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">Not verified</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <p className="mt-2 text-xs text-red-600/80">
            Check that the registration number and date of birth match the document exactly.
          </p>
        </div>
      ) : null}

      {student ? <VerifiedResult student={student} /> : null}
    </div>
  );
}

function VerifiedResult({ student }: { student: VerifiedStudent }) {
  const marks = Object.entries(student.marks);

  return (
    <div className="mt-6 space-y-5">
      <Card>
        <div className="flex flex-wrap items-start gap-5">
          {student.student_photo_src ? (
            <Image
              src={student.student_photo_src}
              alt=""
              width={96}
              height={110}
              unoptimized
              className="h-[110px] w-24 shrink-0 rounded-lg object-cover ring-1 ring-black/10"
            />
          ) : (
            <div className="flex h-[110px] w-24 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-400 ring-1 ring-black/10">
              No photo
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {student.is_certificate_approve ? (
                <Badge tone="green">✓ Certificate verified</Badge>
              ) : student.marksheet_stage === "pending" ? (
                <Badge tone="amber">Marksheet awaiting approval</Badge>
              ) : (
                <Badge tone="blue">Enrolled — not yet certified</Badge>
              )}
              {student.is_student_active ? null : <Badge tone="neutral">Inactive</Badge>}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
              {student.student_name}
            </h2>
            <p className="mt-0.5 font-mono text-sm text-neutral-500">
              {student.registration_number}
            </p>
            <p className="mt-3 text-sm text-neutral-700">
              {student.course_name}{" "}
              <span className="text-neutral-400">({student.short_form})</span> ·{" "}
              {student.course_duration} month{student.course_duration > 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">
              {student.branch_name} · Centre code {student.branch_code}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Student details
          </h3>
          <dl>
            <DataRow label="Father's name" value={student.student_father_name || "—"} />
            <DataRow label="Mother's name" value={student.student_mother_name || "—"} />
            <DataRow label="Date of birth" value={student.dob} />
            <DataRow label="Phone" value={student.student_phone} />
            <DataRow label="Email" value={student.student_email} />
            <DataRow label="Aadhaar" value={student.aadhaar_number} />
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-neutral-400">
            Contact details are partially masked. Only the institute holds the full record.
          </p>
        </Card>

        <Card>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Course record
          </h3>
          <dl>
            <DataRow label="Admission date" value={student.admission_date} />
            <DataRow label="Relieving date" value={student.relieving_date} />
            <DataRow label="Marksheet no." value={student.marksheet_id || "—"} />
            <DataRow
              label="Certified on"
              value={student.certified_date || "Not yet certified"}
            />
            <DataRow
              label="Overall"
              value={
                student.overall_percent === null ? "—" : `${student.overall_percent}%`
              }
            />
            <DataRow label="Performance" value={student.performance || "—"} />
          </dl>
        </Card>
      </div>

      {marks.length > 0 ? (
        <Card>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Marks obtained
          </h3>
          <div className="table-scroll">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="pb-2 font-semibold text-neutral-600">Subject</th>
                  <th className="pb-2 text-right font-semibold text-neutral-600">Full marks</th>
                  <th className="pb-2 text-right font-semibold text-neutral-600">Obtained</th>
                </tr>
              </thead>
              <tbody>
                {marks.map(([subject, value]) => (
                  <tr key={subject} className="border-b border-neutral-100 last:border-b-0">
                    <td className="py-2.5 text-neutral-800">{subject}</td>
                    <td className="py-2.5 text-right tabular-nums text-neutral-400">100</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-neutral-900">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
