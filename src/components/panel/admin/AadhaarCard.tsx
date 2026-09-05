"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/lib/use-api";
import type { StudentRow } from "@/types/api";
import { Card, Field, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";

type Conflict = {
  student_id: number;
  student_name: string;
  registration_number: string;
  branch_name: string;
  branch_code: string;
};

/**
 * Aadhaar is what stops the same person being enrolled twice, so it is
 * admin-only to change and a clash names the student already holding it —
 * usually the same person, enrolled at another branch.
 */
export function AadhaarCard({ student }: { student: StudentRow }) {
  const router = useRouter();
  const { run, pending, error, fieldErrors } = useMutation();

  const [value, setValue] = useState(student.aadhaar_number ?? "");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setConflict(null);
    setSaved(false);

    const result = await run(`/api/students/${student.student_id}/aadhaar`, {
      method: "POST",
      body: { aadhaar_number: value },
    });

    if (result.ok) {
      setSaved(true);
      router.refresh();
    } else if (result.error.status === 409) {
      setConflict(result.error.payload?.conflict as Conflict | null);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        Aadhaar number
      </h2>
      <p className="mb-4 text-sm text-neutral-500">
        Only head office can change this. It is the key that prevents the same student being
        enrolled twice.
      </p>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <Field
          label="12-digit Aadhaar"
          htmlFor="aadhaar"
          error={fieldErrors.aadhaar_number}
          className="min-w-[220px] flex-1"
        >
          <input
            id="aadhaar"
            inputMode="numeric"
            maxLength={12}
            required
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
            className={`${inputClass} font-mono`}
          />
        </Field>

        <Button
          type="submit"
          variant="secondary"
          disabled={pending || value === (student.aadhaar_number ?? "")}
        >
          {pending ? <Spinner className="h-4 w-4 animate-spin" /> : null}
          Update Aadhaar
        </Button>
      </form>

      {saved ? (
        <p className="mt-3 text-[13px] font-medium text-emerald-700">Aadhaar updated.</p>
      ) : null}

      {conflict ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
          <p className="text-[13px] font-semibold text-amber-900">
            Already registered to another student
          </p>
          <p className="mt-1 text-[13px] text-amber-800">
            <Link
              href={`/admin-abc/students/${conflict.student_id}`}
              className="font-semibold underline"
            >
              {conflict.student_name}
            </Link>{" "}
            (<span className="font-mono">{conflict.registration_number}</span>) at{" "}
            {conflict.branch_name}. If these are the same person, one of the two records is a
            duplicate.
          </p>
        </div>
      ) : error && !conflict ? (
        <p className="mt-3 text-[13px] text-red-600">{error}</p>
      ) : null}
    </Card>
  );
}
