"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation } from "@/lib/use-api";
import { useToast } from "@/components/toast/Toast";

/**
 * Aadhaar update — ported from the modal in
 * resources/views/superadmin/pages/edit-student.blade.php.
 *
 * Opens pre-filled with the current number, and Save stays disabled until the
 * value actually changes, so the button can never fire a no-op write. Aadhaar
 * is the de-duplication key, so a clash names the student already holding it
 * and links straight to them — usually the same person enrolled twice.
 */

type Conflict = {
  student_id: number;
  student_name: string;
  student_father_name: string | null;
  student_phone: string | null;
  registration_number: string;
  branch_name: string;
  branch_code: string;
};

export function SaAadhaarModal({
  studentId,
  current,
  onClose,
  onSaved,
}: {
  studentId: number;
  current: string | null;
  onClose: () => void;
  onSaved: (aadhaar: string) => void;
}) {
  const toast = useToast();
  const { run, pending, error, fieldErrors } = useMutation();

  const [value, setValue] = useState(current ?? "");
  const [conflict, setConflict] = useState<Conflict | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const unchanged = value.trim() === (current ?? "").trim();
  const tooShort = value.trim().length !== 12;

  async function submit() {
    setConflict(null);

    const result = await run(`/api/students/${studentId}/aadhaar`, {
      method: "POST",
      body: { aadhaar_number: value.trim() },
    });

    if (result.ok) {
      toast.success("Aadhaar updated.");
      onSaved(value.trim());
      onClose();
      return;
    }

    if (result.error.status === 409) {
      setConflict((result.error.payload?.conflict as Conflict) ?? null);
    }
  }

  return (
    <div
      className="sa-fragile-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sa-fragile-password-modal" role="dialog" aria-modal="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>Update Aadhaar</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Enter the new Aadhaar number for this student.
            </p>
          </div>
          <button type="button" className="sa-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <label className="sa-edit-label" htmlFor="sa-new-aadhaar">
            New Aadhaar Number
          </label>
          <input
            id="sa-new-aadhaar"
            type="text"
            inputMode="numeric"
            maxLength={12}
            className="sa-edit-input"
            placeholder="Enter new aadhaar number"
            autoFocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value.replace(/\D/g, ""));
              setConflict(null);
            }}
          />
          <p className="sa-aadhaar-hint">12-digit Aadhaar number.</p>

          {error && !conflict ? (
            <div className="sa-fragile-password-error">
              {fieldErrors.aadhaar_number ?? error}
            </div>
          ) : null}

          {conflict ? (
            <div
              style={{
                marginTop: 12,
                padding: "14px 16px",
                borderRadius: 12,
                background: "#fef2f2",
                border: "1px solid #fecaca",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
                Already registered to another student
              </div>
              <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.7 }}>
                <Link
                  href={`/admin-abc/students/${conflict.student_id}`}
                  style={{ fontWeight: 700, color: "#7f1d1d" }}
                >
                  {conflict.student_name}
                </Link>
                <br />
                {conflict.registration_number}
                {conflict.student_father_name ? ` · s/o ${conflict.student_father_name}` : ""}
                <br />
                {conflict.branch_name} ({conflict.branch_code})
                {conflict.student_phone ? ` · ${conflict.student_phone}` : ""}
              </div>
            </div>
          ) : null}
        </div>

        <div className="sa-fragile-actions" style={{ marginTop: 20 }}>
          <button type="button" className="sa-fragile-secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sa-fragile-primary-btn"
            disabled={pending || unchanged || tooShort}
            onClick={submit}
            title={
              unchanged
                ? "Change the number to enable saving"
                : tooShort
                  ? "Aadhaar must be 12 digits"
                  : undefined
            }
          >
            {pending ? "Saving..." : "Save Aadhaar"}
          </button>
        </div>
      </div>
    </div>
  );
}
